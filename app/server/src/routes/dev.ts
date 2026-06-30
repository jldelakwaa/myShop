import { eq, inArray } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";

import { db } from "../db/index.js";
import { yugiohStructureDecks } from "../data/yugiohStructureDecks.js";
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

export const devRouter: ExpressRouter = Router();

const demoShopDomain = "demo-arcana-vault.myshopify.com";

const demoProducts = yugiohStructureDecks.map((deck, index) => ({
  shopifyProductId: `gid://shopify/Product/structure-deck-${String(index + 1).padStart(3, "0")}`,
  title: deck.title,
  handle: slugify(deck.title),
  vendor: "Yu-Gi-Oh! TCG",
  productType: getDeckProductType(deck.title),
  imageUrl: getDeckPlaceholderUrl(deck.title, deck.year),
  metrics: buildSeedMetrics(index, deck.year),
}));

devRouter.post("/seed", async (_req, res, next) => {
  try {
    await db
      .insert(shops)
      .values({
        shopDomain: demoShopDomain,
        accessToken: "dev-token",
        scope: "read_products,write_products,read_orders",
      })
      .onDuplicateKeyUpdate({
        set: {
          accessToken: "dev-token",
          scope: "read_products,write_products,read_orders",
        },
      });

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, demoShopDomain))
      .limit(1);

    if (!shop) {
      throw new Error("Demo shop could not be created.");
    }

    const existingRecommendations = await db
      .select({ id: signalRecommendations.id })
      .from(signalRecommendations)
      .where(eq(signalRecommendations.shopId, shop.id));

    const recommendationIds = existingRecommendations.map((item) => item.id);

    if (recommendationIds.length > 0) {
      await db
        .delete(recommendationItems)
        .where(inArray(recommendationItems.recommendationId, recommendationIds));
    }

    await db
      .delete(signalRecommendations)
      .where(eq(signalRecommendations.shopId, shop.id));

    await db.delete(signalRules).where(eq(signalRules.shopId, shop.id));

    const existingProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.shopId, shop.id));
    const existingProductIds = existingProducts.map((product) => product.id);

    if (existingProductIds.length > 0) {
      await db
        .delete(productMetrics)
        .where(inArray(productMetrics.productId, existingProductIds));
      await db.delete(products).where(eq(products.shopId, shop.id));
    }

    for (const item of demoProducts) {
      await db
        .insert(products)
        .values({
          shopId: shop.id,
          shopifyProductId: item.shopifyProductId,
          title: item.title,
          handle: item.handle,
          vendor: item.vendor,
          productType: item.productType,
          imageUrl: item.imageUrl,
        })
        .onDuplicateKeyUpdate({
          set: {
            title: item.title,
            handle: item.handle,
            vendor: item.vendor,
            productType: item.productType,
            imageUrl: item.imageUrl,
          },
        });
    }

    const seededProducts = await db
      .select()
      .from(products)
      .where(eq(products.shopId, shop.id));

    const productIds = seededProducts.map((product) => product.id);

    if (productIds.length > 0) {
      await db
        .delete(productMetrics)
        .where(inArray(productMetrics.productId, productIds));
    }

    for (const product of seededProducts) {
      const seed = demoProducts.find(
        (item) => item.shopifyProductId === product.shopifyProductId,
      );

      if (!seed) continue;

      await db.insert(productMetrics).values({
        productId: product.id,
        ...seed.metrics,
      });
    }

    await db.insert(signalRules).values({
      shopId: shop.id,
      name: "Default merchandising signal",
      description:
        "Balances stock risk, stale inventory, sell-through, margin, and conversion.",
    });

    const [rule] = await db
      .select()
      .from(signalRules)
      .where(eq(signalRules.shopId, shop.id))
      .limit(1);

    if (!rule) {
      throw new Error("Demo signal rule could not be created.");
    }

    const metrics = await db
      .select()
      .from(productMetrics)
      .where(inArray(productMetrics.productId, productIds));

    for (const metric of metrics) {
      const product = seededProducts.find((item) => item.id === metric.productId);

      if (!product) continue;

      const score = scoreProduct(metric, rule);
      const priority = getPriority(score);
      const type =
        metric.inventoryQuantity <= rule.lowStockThreshold
          ? "restock"
          : metric.inventoryAgeDays >= rule.staleStockDays
            ? "discount"
            : "feature_on_homepage";

      await db.insert(signalRecommendations).values({
        shopId: shop.id,
        ruleId: rule.id,
        title: `${product.title}: ${type.replaceAll("_", " ")}`,
        recommendationType: type,
        priority,
        score,
        reason:
          type === "restock"
            ? "Inventory is below the configured low-stock threshold."
            : type === "discount"
              ? "Inventory is aging and may need a demand boost."
              : "Strong recent demand makes this a good merchandising candidate.",
        metadata: {
          productId: product.id,
          inventoryQuantity: metric.inventoryQuantity,
          inventoryAgeDays: metric.inventoryAgeDays,
          unitsSold30d: metric.unitsSold30d,
        },
      });
    }

    const recommendations = await db
      .select()
      .from(signalRecommendations)
      .where(eq(signalRecommendations.shopId, shop.id));

    for (const recommendation of recommendations) {
      const metadata = recommendation.metadata as { productId?: number } | null;
      const productId = metadata?.productId;

      if (!productId) continue;

      await db.insert(recommendationItems).values({
        recommendationId: recommendation.id,
        productId,
        role: "primary",
        productScore: recommendation.score,
      });
    }

    await logActivity({
      shopId: shop.id,
      eventType: "dev_seed_completed",
      message:
        "Demo shop seeded with Yu-Gi-Oh! Structure Deck products, metrics, rule, and recommendations.",
      metadata: {
        products: seededProducts.length,
        recommendations: recommendations.length,
      },
    });

    res.json({
      ok: true,
      shop: demoShopDomain,
      products: seededProducts.length,
      recommendations: recommendations.length,
    });
  } catch (error) {
    next(error);
  }
});

function buildSeedMetrics(index: number, year: number) {
  const inventoryPattern = [4, 7, 12, 18, 26, 34, 52, 3, 9, 64, 21, 42];
  const salesPattern = [31, 24, 18, 9, 5, 14, 28, 3, 22, 7, 16, 11];
  const recentness = Math.max(0, 2026 - year);
  const inventoryQuantity = inventoryPattern[index % inventoryPattern.length] ?? 0;
  const baseSales = salesPattern[index % salesPattern.length] ?? 0;
  const unitsSold30d = Math.max(1, baseSales - Math.min(recentness, 8));
  const views30d = 260 + ((index * 73) % 820) + Math.max(0, 2026 - year) * 4;

  return {
    inventoryQuantity,
    reorderPoint: 10 + (index % 5) * 2,
    unitsSold30d,
    views30d,
    conversionRate: Math.min(unitsSold30d / views30d, 0.12).toFixed(4),
    grossMargin: (0.44 + (index % 8) * 0.032).toFixed(4),
    daysSinceLastSale: [1, 2, 3, 5, 8, 13, 21, 34][index % 8],
    inventoryAgeDays: 12 + recentness * 31 + (index % 7) * 8,
  };
}

function getDeckProductType(title: string) {
  if (/blue-eyes|dragon|dragunity|albaz/i.test(title)) return "Dragon Structure Deck";
  if (/cyber|machine|machina|geargia|powercode/i.test(title)) return "Machine Structure Deck";
  if (/zombie|dark|underworld|shaddoll|fallen|marik/i.test(title)) return "Dark Structure Deck";
  if (/spellcaster|charmer|yugi|pendulum|light|sanctuary/i.test(title)) return "Spellcaster Structure Deck";
  if (/warrior|samurai|hero|kaiba/i.test(title)) return "Warrior Structure Deck";
  if (/sea|fury|freezing/i.test(title)) return "Water Structure Deck";
  if (/fire|blaze|soulburner/i.test(title)) return "Fire Structure Deck";
  if (/dinosaur|beast|storm/i.test(title)) return "Creature Structure Deck";

  return "Structure Deck";
}

function getDeckPlaceholderUrl(title: string, year: number) {
  const label = encodeURIComponent(`${year} ${title}`).replaceAll("%20", "+");

  return `https://placehold.co/640x640/140f1f/fff7df?text=${label}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

devRouter.delete("/reset", async (_req, res, next) => {
  try {
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, demoShopDomain))
      .limit(1);

    if (!shop) {
      res.json({ ok: true, message: "No demo data to reset." });
      return;
    }

    const seededProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.shopId, shop.id));
    const productIds = seededProducts.map((product) => product.id);

    const recommendations = await db
      .select({ id: signalRecommendations.id })
      .from(signalRecommendations)
      .where(eq(signalRecommendations.shopId, shop.id));
    const recommendationIds = recommendations.map((item) => item.id);

    if (recommendationIds.length > 0) {
      await db
        .delete(recommendationItems)
        .where(inArray(recommendationItems.recommendationId, recommendationIds));
    }

    await db
      .delete(signalRecommendations)
      .where(eq(signalRecommendations.shopId, shop.id));
    await db.delete(signalRules).where(eq(signalRules.shopId, shop.id));

    if (productIds.length > 0) {
      await db
        .delete(productMetrics)
        .where(inArray(productMetrics.productId, productIds));
    }

    await db.delete(products).where(eq(products.shopId, shop.id));

    await logActivity({
      shopId: shop.id,
      eventType: "dev_seed_reset",
      message: "Demo product and recommendation data reset.",
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
