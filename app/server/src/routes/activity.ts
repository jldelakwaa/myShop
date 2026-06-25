import { desc, eq } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";

import { db } from "../db/index.js";
import { activityLogs, shops } from "../db/schema.js";

export const activityRouter: ExpressRouter = Router();

activityRouter.get("/", async (req, res, next) => {
  try {
    // Determine the shop domain from the query parameters or use a default
    const shopDomain =
      typeof req.query.shop === "string"
        ? req.query.shop
        : "demo-lumen-loom.myshopify.com";

    // Fetch the shop by domain
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1);

    if (!shop) {
      res.status(404).json({
        ok: false,
        error: "Shop not found.",
      });
      return;
    }

    // Fetch the latest 50 activity logs for the shop
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.shopId, shop.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(50);

    res.json({
      ok: true,
      activity: logs,
    });
  } catch (error) {
    next(error);
  }
});
