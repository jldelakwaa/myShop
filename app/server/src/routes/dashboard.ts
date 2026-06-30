import { desc, eq, inArray } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";

import { db } from "../db/index.js";
import {
  activityLogs,
  productMetrics,
  products,
  shops,
  signalRecommendations,
  signalRules,
} from "../db/schema.js";

export const dashboardRouter: ExpressRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const shopDomain =
      typeof req.query.shop === "string"
        ? req.query.shop
        : "demo-arcana-vault.myshopify.com";

    // Fetch the shop by domain
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1);

    if (!shop) {
      res.status(404).json({
        ok: false,
        error: "Shop not found. Seed demo data first with POST /api/dev/seed.",
      });
      return;
    }

    // Fetch products, metrics, rules, recommendations, and recent activity for the shop
    const shopProducts = await db
      .select()
      .from(products)
      .where(eq(products.shopId, shop.id));
    const productIds = shopProducts.map((product) => product.id);

    const metrics =
      productIds.length > 0
        ? await db
            .select()
            .from(productMetrics)
            .where(inArray(productMetrics.productId, productIds))
        : [];

    const rules = await db
      .select()
      .from(signalRules)
      .where(eq(signalRules.shopId, shop.id));

    const recommendations = await db
      .select()
      .from(signalRecommendations)
      .where(eq(signalRecommendations.shopId, shop.id))
      .orderBy(desc(signalRecommendations.score))
      .limit(5);

    const recentActivity = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.shopId, shop.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(8);

    const lowStockCount = metrics.filter(
      (metric) => metric.inventoryQuantity <= metric.reorderPoint,
    ).length;
    const staleStockCount = metrics.filter(
      (metric) => metric.inventoryAgeDays >= 60,
    ).length;
    const openRecommendations = recommendations.filter(
      (recommendation) => recommendation.status === "open",
    ).length;
    const syncStatus = getSyncStatus(recentActivity);

    res.json({
      ok: true,
      shop: {
        id: shop.id,
        shopDomain: shop.shopDomain,
      },
      summary: {
        products: shopProducts.length,
        activeRules: rules.filter((rule) => rule.isActive).length,
        lowStockCount,
        staleStockCount,
        openRecommendations,
      },
      syncStatus,
      recommendations,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
});

function getSyncStatus(logs: Array<typeof activityLogs.$inferSelect>) {
  return {
    productsSyncedAt: getLatestEventTime(logs, "products_synced"),
    salesSyncedAt: getLatestEventTime(logs, "sales_metrics_synced"),
    recommendationsGeneratedAt: getLatestEventTime(
      logs,
      "recommendations_generated",
    ),
  };
}

function getLatestEventTime(
  logs: Array<typeof activityLogs.$inferSelect>,
  eventType: string,
) {
  return logs.find((log) => log.eventType === eventType)?.createdAt ?? null;
}
