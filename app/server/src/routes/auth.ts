import { eq } from "drizzle-orm";
import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";

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

    if (shouldRedirectTopLevel(req)) {
      const authUrl = new URL("/auth", getEnv("SHOPIFY_APP_URL"));
      authUrl.searchParams.set("shop", shop);
      authUrl.searchParams.set("top_level", "1");

      sendTopLevelRedirect(res, authUrl.toString());
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

function shouldRedirectTopLevel(req: Request) {
  if (req.query.top_level === "1") {
    return false;
  }

  return (
    req.query.embedded === "1" ||
    req.get("sec-fetch-dest")?.toLowerCase() === "iframe"
  );
}

function sendTopLevelRedirect(res: Response, url: string) {
  const serializedUrl = JSON.stringify(url);
  const escapedUrl = escapeHtml(url);

  res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0;url=${escapedUrl}">
  </head>
  <body>
    <script>
      window.top.location.href = ${serializedUrl};
    </script>
    <a href="${escapedUrl}" target="_top" rel="noreferrer">Continue installation</a>
  </body>
</html>`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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

    const redirectUrl = new URL(getEnv("SHOPIFY_APP_URL"));
    redirectUrl.searchParams.set("shop", session.shop);

    if (typeof req.query.host === "string") {
      redirectUrl.searchParams.set("host", req.query.host);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
});
