import { desc, eq } from "drizzle-orm";
import { Router, type Request, type Router as ExpressRouter } from "express";

import { db } from "../db/index.js";
import { shops, signalRules } from "../db/schema.js";
import { logActivity } from "../services/activity.js";

export const rulesRouter: ExpressRouter = Router();

const demoShopDomain = "demo-lumen-loom.myshopify.com";
const allowedStrategies = ["balanced", "inventory", "clearance", "growth"];

type RulePayload = {
  name?: unknown;
  strategy?: unknown;
  lowStockThreshold?: unknown;
  staleStockDays?: unknown;
  inventoryRiskWeight?: unknown;
  staleStockWeight?: unknown;
  sellThroughWeight?: unknown;
  marginWeight?: unknown;
  isActive?: unknown;
};

rulesRouter.get("/", async (req, res, next) => {
  try {
    const shopDomain = getShopDomain(req);
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1);

    if (!shop) {
      res.json({ ok: true, rules: [] });
      return;
    }

    const rules = await db
      .select()
      .from(signalRules)
      .where(eq(signalRules.shopId, shop.id));

    res.json({ ok: true, rules });
  } catch (error) {
    next(error);
  }
});

rulesRouter.post("/", async (req, res, next) => {
  try {
    const payload = parseRulePayload(req.body);
    const shopDomain = getShopDomain(req);

    let [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1);

    if (!shop) {
      await db.insert(shops).values({
        shopDomain,
        accessToken: "dev-token",
        scope: "read_products,write_products,read_orders",
      });

      [shop] = await db
        .select()
        .from(shops)
        .where(eq(shops.shopDomain, shopDomain))
        .limit(1);
    }

    if (!shop) {
      throw new Error("Shop could not be found.");
    }

    await db.insert(signalRules).values({
      shopId: shop.id,
      ...payload,
    });

    const [rule] = await db
      .select()
      .from(signalRules)
      .where(eq(signalRules.shopId, shop.id))
      .orderBy(desc(signalRules.id))
      .limit(1);

    if (!rule) {
      throw new Error("Rule could not be created.");
    }

    await logActivity({
      shopId: shop.id,
      actorType: "merchant",
      eventType: "rule_created",
      message: `Rule "${rule.name}" was created.`,
      metadata: {
        ruleId: rule.id,
      },
    });

    res.status(201).json({ ok: true, rule });
  } catch (error) {
    next(error);
  }
});

rulesRouter.put("/:id", async (req, res, next) => {
  try {
    const ruleId = Number(req.params.id);

    if (!Number.isInteger(ruleId)) {
      res.status(400).json({
        ok: false,
        error: "Invalid rule id.",
      });
      return;
    }

    const payload = parseRulePayload(req.body);
    const [existing] = await db
      .select()
      .from(signalRules)
      .where(eq(signalRules.id, ruleId))
      .limit(1);

    if (!existing) {
      res.status(404).json({
        ok: false,
        error: "Rule not found.",
      });
      return;
    }

    await db
      .update(signalRules)
      .set(payload)
      .where(eq(signalRules.id, ruleId));

    const [rule] = await db
      .select()
      .from(signalRules)
      .where(eq(signalRules.id, ruleId))
      .limit(1);

    await logActivity({
      shopId: existing.shopId,
      actorType: "merchant",
      eventType: "rule_updated",
      message: `Rule "${payload.name}" was updated.`,
      metadata: {
        ruleId,
      },
    });

    res.json({ ok: true, rule });
  } catch (error) {
    next(error);
  }
});

function parseRulePayload(input: RulePayload) {
  if (typeof input.name !== "string" || input.name.trim().length === 0) {
    throw new HttpError(400, "Rule name is required.");
  }

  if (
    typeof input.strategy !== "string" ||
    !allowedStrategies.includes(input.strategy)
  ) {
    throw new HttpError(400, "Invalid rule strategy.");
  }

  return {
    name: input.name.trim(),
    strategy: input.strategy,
    lowStockThreshold: toInteger(input.lowStockThreshold, "lowStockThreshold"),
    staleStockDays: toInteger(input.staleStockDays, "staleStockDays"),
    inventoryRiskWeight: toInteger(
      input.inventoryRiskWeight,
      "inventoryRiskWeight",
    ),
    staleStockWeight: toInteger(input.staleStockWeight, "staleStockWeight"),
    sellThroughWeight: toInteger(input.sellThroughWeight, "sellThroughWeight"),
    marginWeight: toInteger(input.marginWeight, "marginWeight"),
    isActive: Boolean(input.isActive),
  };
}

function toInteger(value: unknown, field: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new HttpError(400, `${field} must be a positive integer.`);
  }

  return numberValue;
}

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function getShopDomain(req: Request) {
  return typeof req.query.shop === "string" ? req.query.shop : demoShopDomain;
}
