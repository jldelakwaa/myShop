import { and, desc, eq, inArray } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";

import { db } from "../db/index.js";
import {
  productMetrics,
  products,
  recommendationItems,
  shops,
  signalRecommendations,
  signalRules,
} from "../db/schema.js";
import { logActivity } from "../services/activity.js";
import { getPriority, scoreProduct } from "../services/scoring.js";

export const recommendationsRouter: ExpressRouter = Router();

const allowedStatuses = ["open", "accepted", "dismissed"] as const;
const demoShopDomain = "demo-arcana-vault.myshopify.com";

recommendationsRouter.post("/generate", async (req, res, next) => {
  try {
    const shopDomain =
      typeof req.query.shop === "string" ? req.query.shop : demoShopDomain;
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1);

    if (!shop) {
      res.status(404).json({
        ok: false,
        error: "Shop not found. Sync products or seed demo data first.",
      });
      return;
    }

    const shopProducts = await db
      .select()
      .from(products)
      .where(eq(products.shopId, shop.id));
    const productIds = shopProducts.map((product) => product.id);

    if (productIds.length === 0) {
      res.status(400).json({
        ok: false,
        error: "No products found. Sync products first.",
      });
      return;
    }

    const metrics = await db
      .select()
      .from(productMetrics)
      .where(inArray(productMetrics.productId, productIds));
    const rule = await getOrCreateActiveRule(shop.id);
    const existingOpenRecommendations = await db
      .select({ id: signalRecommendations.id })
      .from(signalRecommendations)
      .where(
        and(
          eq(signalRecommendations.shopId, shop.id),
          eq(signalRecommendations.status, "open"),
        ),
      );
    const existingOpenIds = existingOpenRecommendations.map((item) => item.id);

    if (existingOpenIds.length > 0) {
      await db
        .delete(recommendationItems)
        .where(inArray(recommendationItems.recommendationId, existingOpenIds));
      await db
        .delete(signalRecommendations)
        .where(inArray(signalRecommendations.id, existingOpenIds));
    }

    let generatedCount = 0;

    for (const metric of metrics) {
      const product = shopProducts.find((item) => item.id === metric.productId);

      if (!product) continue;

      const score = scoreProduct(metric, rule);
      const recommendationType = getRecommendationType(metric, rule);

      await db.insert(signalRecommendations).values({
        shopId: shop.id,
        ruleId: rule.id,
        title: `${product.title}: ${recommendationType.replaceAll("_", " ")}`,
        recommendationType,
        priority: getPriority(score),
        score,
        reason: getRecommendationReason(recommendationType),
        metadata: {
          productId: product.id,
          inventoryQuantity: metric.inventoryQuantity,
          inventoryAgeDays: metric.inventoryAgeDays,
          unitsSold30d: metric.unitsSold30d,
        },
      });

      const [recommendation] = await db
        .select()
        .from(signalRecommendations)
        .where(eq(signalRecommendations.shopId, shop.id))
        .orderBy(desc(signalRecommendations.id))
        .limit(1);

      if (recommendation) {
        await db.insert(recommendationItems).values({
          recommendationId: recommendation.id,
          productId: product.id,
          role: "primary",
          productScore: score,
        });
        generatedCount += 1;
      }
    }

    await logActivity({
      shopId: shop.id,
      eventType: "recommendations_generated",
      message: `Generated ${generatedCount} product recommendations.`,
      metadata: {
        recommendations: generatedCount,
      },
    });

    res.json({
      ok: true,
      recommendations: generatedCount,
    });
  } catch (error) {
    next(error);
  }
});

recommendationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const recommendationId = Number(req.params.id);
    const status = req.body.status;

    if (!Number.isInteger(recommendationId)) {
      res.status(400).json({
        ok: false,
        error: "Invalid recommendation id.",
      });
      return;
    }

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        ok: false,
        error: "Status must be open, accepted, or dismissed.",
      });
      return;
    }

    // Check if the recommendation exists
    const [existing] = await db
      .select()
      .from(signalRecommendations)
      .where(eq(signalRecommendations.id, recommendationId))
      .limit(1);

    if (!existing) {
      res.status(404).json({
        ok: false,
        error: "Recommendation not found.",
      });
      return;
    }

    // Update the recommendation status
    await db
      .update(signalRecommendations)
      .set({
        status,
      })
      .where(eq(signalRecommendations.id, recommendationId));

    const [updated] = await db
      .select()
      .from(signalRecommendations)
      .where(eq(signalRecommendations.id, recommendationId))
      .limit(1);

    const statusLabel =
      status === "open" ? "reopened" : status;

    await logActivity({
      shopId: existing.shopId,
      actorType: "merchant",
      eventType: `recommendation_${status}`,
      message: `Recommendation "${existing.title}" was ${statusLabel}.`,
      metadata: {
        recommendationId,
        previousStatus: existing.status,
        nextStatus: status,
      },
    });

    res.json({
      ok: true,
      recommendation: updated,
    });
  } catch (error) {
    next(error);
  }
});

async function getOrCreateActiveRule(shopId: number) {
  const [existingRule] = await db
    .select()
    .from(signalRules)
    .where(and(eq(signalRules.shopId, shopId), eq(signalRules.isActive, true)))
    .orderBy(desc(signalRules.id))
    .limit(1);

  if (existingRule) {
    return existingRule;
  }

  await db.insert(signalRules).values({
    shopId,
    name: "Default merchandising signal",
    description:
      "Balances stock risk, stale inventory, sell-through, margin, and conversion.",
  });

  const [createdRule] = await db
    .select()
    .from(signalRules)
    .where(eq(signalRules.shopId, shopId))
    .orderBy(desc(signalRules.id))
    .limit(1);

  if (!createdRule) {
    throw new Error("Signal rule could not be created.");
  }

  return createdRule;
}

function getRecommendationType(
  metric: typeof productMetrics.$inferSelect,
  rule: typeof signalRules.$inferSelect,
) {
  if (metric.inventoryQuantity <= rule.lowStockThreshold) {
    return "restock";
  }

  if (metric.inventoryAgeDays >= rule.staleStockDays) {
    return "discount";
  }

  if (metric.unitsSold30d > 0) {
    return "feature_on_homepage";
  }

  return "watch_inventory";
}

function getRecommendationReason(
  recommendationType: ReturnType<typeof getRecommendationType>,
) {
  if (recommendationType === "restock") {
    return "Inventory is below the active low-stock threshold.";
  }

  if (recommendationType === "discount") {
    return "Inventory is aging and may need a demand boost.";
  }

  if (recommendationType === "feature_on_homepage") {
    return "Recent demand makes this a good merchandising candidate.";
  }

  return "Keep this product on watch until stronger sales or inventory signals appear.";
}
