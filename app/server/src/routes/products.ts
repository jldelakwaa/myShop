import { and, eq, inArray } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";
import { Session } from "@shopify/shopify-api";

import { db } from "../db/index.js";
import { productMetrics, products, shops } from "../db/schema.js";
import { shopify } from "../shopify.js";
import { logActivity } from "../services/activity.js";

export const productsRouter: ExpressRouter = Router();

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string | null;
  vendor: string | null;
  productType: string | null;
  status: string;
  totalInventory: number | null;
  featuredImage: {
    url: string;
  } | null;
};

type ProductsResponse = {
  products: {
    nodes: ShopifyProductNode[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

const productsQuery = `#graphql
  query ProductsForSignalShelf($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        title
        handle
        vendor
        productType
        status
        totalInventory
        featuredImage {
          url
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

productsRouter.post("/sync", async (req, res, next) => {
  try {
    const shopDomain = req.query.shop;

    if (typeof shopDomain !== "string") {
      res.status(400).json({
        ok: false,
        error: "Missing shop query parameter.",
      });
      return;
    }

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1);

    if (!shop?.accessToken) {
      res.status(404).json({
        ok: false,
        error: "Shop is not installed or does not have an access token.",
      });
      return;
    }

    const session = new Session({
      id: `offline_${shop.shopDomain}`,
      shop: shop.shopDomain,
      state: "sync-products",
      isOnline: false,
      accessToken: shop.accessToken,
      ...(shop.scope ? { scope: shop.scope } : {}),
    });
    const client = new shopify.clients.Graphql({ session });

    let after: string | null = null;
    let syncedCount = 0;

    do {
      const response = (await client.request<ProductsResponse>(productsQuery, {
        variables: {
          first: 100,
          after,
        },
      })) as { data?: ProductsResponse };
      const page: ProductsResponse["products"] | undefined =
        response.data?.products;

      if (!page) {
        throw new Error("Shopify product sync returned no product data.");
      }

      await upsertProducts(shop.id, page.nodes);
      syncedCount += page.nodes.length;
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (after);

    await logActivity({
      shopId: shop.id,
      eventType: "products_synced",
      message: `Synced ${syncedCount} products from Shopify.`,
      metadata: {
        products: syncedCount,
      },
    });

    res.json({
      ok: true,
      products: syncedCount,
    });
  } catch (error) {
    next(error);
  }
});

async function upsertProducts(shopId: number, shopifyProducts: ShopifyProductNode[]) {
  if (shopifyProducts.length === 0) {
    return;
  }

  for (const product of shopifyProducts) {
    await db
      .insert(products)
      .values({
        shopId,
        shopifyProductId: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        productType: product.productType,
        status: toProductStatus(product.status),
        imageUrl: product.featuredImage?.url ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          title: product.title,
          handle: product.handle,
          vendor: product.vendor,
          productType: product.productType,
          status: toProductStatus(product.status),
          imageUrl: product.featuredImage?.url ?? null,
        },
      });
  }

  const productGids = shopifyProducts.map((product) => product.id);
  const syncedProducts = await db
    .select()
    .from(products)
    .where(
      and(eq(products.shopId, shopId), inArray(products.shopifyProductId, productGids)),
    );
  const syncedProductIds = syncedProducts.map((product) => product.id);
  const existingMetrics =
    syncedProductIds.length > 0
      ? await db
          .select()
          .from(productMetrics)
          .where(inArray(productMetrics.productId, syncedProductIds))
      : [];
  const existingMetricProductIds = new Set(
    existingMetrics.map((metric) => metric.productId),
  );

  for (const syncedProduct of syncedProducts) {
    const sourceProduct = shopifyProducts.find(
      (product) => product.id === syncedProduct.shopifyProductId,
    );
    const inventoryQuantity = sourceProduct?.totalInventory ?? 0;

    if (existingMetricProductIds.has(syncedProduct.id)) {
      await db
        .update(productMetrics)
        .set({ inventoryQuantity })
        .where(eq(productMetrics.productId, syncedProduct.id));
      continue;
    }

    await db.insert(productMetrics).values({
      productId: syncedProduct.id,
      inventoryQuantity,
    });
  }
}

function toProductStatus(status: string): "active" | "draft" | "archived" {
  const normalized = status.toLowerCase();

  if (normalized === "draft" || normalized === "archived") {
    return normalized;
  }

  return "active";
}
