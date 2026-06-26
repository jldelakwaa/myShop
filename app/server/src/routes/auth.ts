import { eq } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";

import { db } from "../db/index.js";
import { sessions, shops } from "../db/schema.js";
import { shopify } from "../shopify.js";
import { getEnv } from "../env.js";

export const authRouter: ExpressRouter = Router();

authRouter.get("/", async (req, res, next) => {
  try {
    const shop = req.query.shop;

    if (typeof shop !== "string") {
      res.status(400).json({
        ok: false,
        error: "Missing shop query parameter.",
      });
      return;
    }

    await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/callback", async (req, res, next) => {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const session = callback.session;

    await db
      .insert(shops)
      .values({
        shopDomain: session.shop,
        accessToken: session.accessToken,
        scope: session.scope,
      })
      .onDuplicateKeyUpdate({
        set: {
          accessToken: session.accessToken,
          scope: session.scope,
        },
      });

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, session.shop))
      .limit(1);

    if (!shop) {
      throw new Error("Shop could not be saved.");
    }

    await db
      .insert(sessions)
      .values({
        id: session.id,
        shopId: shop.id,
        shopDomain: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        accessToken: session.accessToken,
        expiresAt: session.expires,
      })
      .onDuplicateKeyUpdate({
        set: {
          state: session.state,
          isOnline: session.isOnline,
          scope: session.scope,
          accessToken: session.accessToken,
          expiresAt: session.expires,
        },
      });

    const redirectUrl = new URL(getEnv("FRONTEND_APP_URL"));
    redirectUrl.searchParams.set("shop", session.shop);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
});
