import { eq, inArray } from "drizzle-orm";
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

export const devRouter: ExpressRouter = Router();

const demoShopDomain = "demo-lumen-loom.myshopify.com";

const demoProducts = [
  {
    shopifyProductId: "gid://shopify/Product/1001",
    title: "Halo Desk Kit",
    handle: "halo-desk-kit",
    vendor: "Lumen Loom",
    productType: "Desk Lighting",
    imageUrl: "https://placehold.co/640x640?text=Halo+Desk+Kit",
    metrics: {
      inventoryQuantity: 7,
      reorderPoint: 12,
      unitsSold30d: 26,
      views30d: 890,
      conversionRate: "0.0520",
      grossMargin: "0.6400",
      daysSinceLastSale: 1,
      inventoryAgeDays: 18,
    },
  },
  {
    shopifyProductId: "gid://shopify/Product/1002",
    title: "Studio Glow Rail",
    handle: "studio-glow-rail",
    vendor: "Lumen Loom",
    productType: "Wall Lighting",
    imageUrl: "https://placehold.co/640x640?text=Studio+Glow+Rail",
    metrics: {
      inventoryQuantity: 34,
      reorderPoint: 10,
      unitsSold30d: 9,
      views30d: 420,
      conversionRate: "0.0210",
      grossMargin: "0.5100",
      daysSinceLastSale: 5,
      inventoryAgeDays: 74,
    },
  },
  {
    shopifyProductId: "gid://shopify/Product/1003",
    title: "Corner Wash Starter Set",
    handle: "corner-wash-starter-set",
    vendor: "Lumen Loom",
    productType: "Room Lighting",
    imageUrl: "https://placehold.co/640x640?text=Corner+Wash",
    metrics: {
      inventoryQuantity: 4,
      reorderPoint: 8,
      unitsSold30d: 18,
      views30d: 610,
      conversionRate: "0.0410",
      grossMargin: "0.5800",
      daysSinceLastSale: 2,
      inventoryAgeDays: 28,
    },
  },
  {
    shopifyProductId: "gid://shopify/Product/1004",
    title: "Aurora Shelf Pods",
    handle: "aurora-shelf-pods",
    vendor: "Lumen Loom",
    productType: "Accent Lighting",
    imageUrl: "https://placehold.co/640x640?text=Aurora+Pods",
    metrics: {
      inventoryQuantity: 52,
      reorderPoint: 10,
      unitsSold30d: 3,
      views30d: 190,
      conversionRate: "0.0090",
      grossMargin: "0.4700",
      daysSinceLastSale: 19,
      inventoryAgeDays: 96,
    },
  },
];

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
      message: "Demo shop, products, metrics, rule, and recommendations seeded.",
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
