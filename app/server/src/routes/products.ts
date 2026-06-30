import { and, eq, inArray } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";
import { Session } from "@shopify/shopify-api";

import { db } from "../db/index.js";
import { yugiohStructureDecks } from "../data/yugiohStructureDecks.js";
import { productMetrics, products, shops } from "../db/schema.js";
import { shopify } from "../shopify.js";
import { logActivity } from "../services/activity.js";

export const productsRouter: ExpressRouter = Router();

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string | null;
  createdAt: string;
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

type ShopifyOrderNode = {
  createdAt: string;
  lineItems: {
    nodes: Array<{
      quantity: number;
      product: {
        id: string;
      } | null;
    }>;
  };
};

type OrdersResponse = {
  orders: {
    nodes: ShopifyOrderNode[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type ProductSetResponse = {
  productSet: {
    product: ShopifyProductNode | null;
    userErrors: Array<{
      field: string[] | null;
      message: string;
    }>;
  };
};

type ProductCreateMediaResponse = {
  productCreateMedia: {
    media: Array<{
      alt: string | null;
      mediaContentType: string;
      status: string;
    }>;
    mediaUserErrors: Array<{
      field: string[] | null;
      message: string;
    }>;
    product: {
      id: string;
      featuredImage: {
        url: string;
      } | null;
    } | null;
  };
};

type PublicationsResponse = {
  publications: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
  };
};

type PublishablePublishResponse = {
  publishablePublish: {
    userErrors: Array<{
      field: string[] | null;
      message: string;
    }>;
  };
};

const productsQuery = `#graphql
  query ProductsForSignalShelf($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        title
        handle
        createdAt
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

const productSetMutation = `#graphql
  mutation SeedStructureDeckProduct(
    $identifier: ProductSetIdentifiers,
    $input: ProductSetInput!,
    $synchronous: Boolean!
  ) {
    productSet(identifier: $identifier, input: $input, synchronous: $synchronous) {
      product {
        id
        title
        handle
        createdAt
        vendor
        productType
        status
        totalInventory
        featuredImage {
          url
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const productCreateMediaMutation = `#graphql
  mutation AddStructureDeckImage($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        alt
        mediaContentType
        status
      }
      mediaUserErrors {
        field
        message
      }
      product {
        id
        featuredImage {
          url
        }
      }
    }
  }
`;

const publicationsQuery = `#graphql
  query PublicationsForSignalShelf {
    publications(first: 20) {
      nodes {
        id
        name
      }
    }
  }
`;

const publishablePublishMutation = `#graphql
  mutation PublishStructureDeck($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;


const ordersQuery = `#graphql
  query OrdersForSignalShelf($first: Int!, $after: String, $query: String!) {
    orders(first: $first, after: $after, query: $query) {
      nodes {
        createdAt
        lineItems(first: 100) {
          nodes {
            quantity
            product {
              id
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

productsRouter.get("/", async (req, res, next) => {
  try {
    const shopDomain =
      typeof req.query.shop === "string"
        ? req.query.shop
        : "demo-arcana-vault.myshopify.com";
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
    const metrics =
      productIds.length > 0
        ? await db
            .select()
            .from(productMetrics)
            .where(inArray(productMetrics.productId, productIds))
        : [];
    const metricsByProductId = new Map(
      metrics.map((metric) => [metric.productId, metric]),
    );

    res.json({
      ok: true,
      shop: {
        id: shop.id,
        shopDomain: shop.shopDomain,
      },
      products: shopProducts.map((product) => ({
        ...product,
        metrics: metricsByProductId.get(product.id) ?? null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

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

    const session = createOfflineSession({
      accessToken: shop.accessToken,
      scope: shop.scope,
      shopDomain: shop.shopDomain,
      state: "sync-products",
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

productsRouter.post("/sync-sales", async (req, res, next) => {
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

    const shopProducts = await db
      .select()
      .from(products)
      .where(eq(products.shopId, shop.id));

    if (shopProducts.length === 0) {
      res.status(400).json({
        ok: false,
        error: "No products found. Sync products first.",
      });
      return;
    }

    const client = new shopify.clients.Graphql({
      session: createOfflineSession({
        accessToken: shop.accessToken,
        scope: shop.scope,
        shopDomain: shop.shopDomain,
        state: "sync-sales",
      }),
    });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orderMetrics = await fetchOrderMetrics(
      client,
      `created_at:>=${since.toISOString().slice(0, 10)}`,
    );
    const updatedProducts = await updateOrderMetrics(shopProducts, orderMetrics);

    await logActivity({
      shopId: shop.id,
      eventType: "sales_metrics_synced",
      message: `Synced 30-day sales metrics for ${updatedProducts} products.`,
      metadata: {
        products: updatedProducts,
      },
    });

    res.json({
      ok: true,
      products: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/seed-shopify", async (req, res, next) => {
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

    const client = new shopify.clients.Graphql({
      session: createOfflineSession({
        accessToken: shop.accessToken,
        scope: shop.scope,
        shopDomain: shop.shopDomain,
        state: "seed-structure-decks",
      }),
    });
    const syncedProducts: ShopifyProductNode[] = [];
    const errors: Array<{ title: string; message: string }> = [];
    const publicationResult = hasScope(shop.scope, "write_publications")
      ? await getOnlineStorePublicationId(client)
      : {
          publicationId: null,
          errors: [
            "Missing write_publications scope. Update scopes and reinstall the app to publish products to Online Store.",
          ],
        };

    if (publicationResult.errors.length > 0) {
      errors.push(
        ...publicationResult.errors.map((message) => ({
          title: "Publishing",
          message,
        })),
      );
    }

    for (const [index, deck] of yugiohStructureDecks.entries()) {
      const input = buildStructureDeckProductInput(deck.title, deck.year, index);
      const response = (await client.request<ProductSetResponse>(
        productSetMutation,
        {
          variables: {
            identifier: {
              handle: input.handle,
            },
            input,
            synchronous: true,
          },
        },
      )) as { data?: ProductSetResponse };
      const result = response.data?.productSet;

      if (!result) {
        errors.push({
          title: deck.title,
          message: "Shopify returned no productSet result.",
        });
        continue;
      }

      if (result.userErrors.length > 0) {
        errors.push(
          ...result.userErrors.map((error) => ({
            title: deck.title,
            message: formatShopifyUserError(error.field, error.message),
          })),
        );
        continue;
      }

      if (result.product) {
        if (publicationResult.publicationId) {
          const publishErrors = await publishProduct(
            client,
            result.product.id,
            publicationResult.publicationId,
          );

          if (publishErrors.length > 0) {
            errors.push(
              ...publishErrors.map((message) => ({
                title: deck.title,
                message,
              })),
            );
          }
        }

        const imageResult = result.product.featuredImage
          ? {
              imageUrl: result.product.featuredImage.url,
              errors: [],
              isTrialFileUploadBlocked: false,
            }
          : await addStructureDeckImage(client, result.product.id, deck.title);

        if (imageResult.errors.length > 0 && !imageResult.isTrialFileUploadBlocked) {
          errors.push(
            ...imageResult.errors.map((message) => ({
              title: deck.title,
              message,
            })),
          );
        }

        syncedProducts.push({
          ...result.product,
          featuredImage: {
            url:
              imageResult.imageUrl ??
              result.product.featuredImage?.url ??
              getDeckPlaceholderUrl(deck.title),
          },
        });
      }
    }

    await upsertProducts(shop.id, syncedProducts);

    await logActivity({
      shopId: shop.id,
      eventType: "shopify_structure_decks_seeded",
      message: `Created or updated ${syncedProducts.length} Structure Deck products in Shopify.`,
      metadata: {
        products: syncedProducts.length,
        errors,
      },
    });

    res.json({
      ok: true,
      products: syncedProducts.length,
      errors,
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
        .set({
          inventoryAgeDays: getAgeInDays(sourceProduct?.createdAt),
          inventoryQuantity,
        })
        .where(eq(productMetrics.productId, syncedProduct.id));
      continue;
    }

    await db.insert(productMetrics).values({
      productId: syncedProduct.id,
      inventoryAgeDays: getAgeInDays(sourceProduct?.createdAt),
      inventoryQuantity,
    });
  }
}

async function fetchOrderMetrics(
  client: InstanceType<typeof shopify.clients.Graphql>,
  query: string,
) {
  const metrics = new Map<
    string,
    {
      unitsSold30d: number;
      lastSaleAt: Date | null;
    }
  >();
  let after: string | null = null;

  do {
    const response = (await client.request<OrdersResponse>(ordersQuery, {
      variables: {
        first: 100,
        after,
        query,
      },
    })) as { data?: OrdersResponse };
    const page: OrdersResponse["orders"] | undefined = response.data?.orders;

    if (!page) {
      throw new Error("Shopify sales sync returned no order data.");
    }

    for (const order of page.nodes) {
      const saleDate = new Date(order.createdAt);

      for (const lineItem of order.lineItems.nodes) {
        const productId = lineItem.product?.id;

        if (!productId) continue;

        const current = metrics.get(productId) ?? {
          unitsSold30d: 0,
          lastSaleAt: null,
        };

        current.unitsSold30d += lineItem.quantity;

        if (!current.lastSaleAt || saleDate > current.lastSaleAt) {
          current.lastSaleAt = saleDate;
        }

        metrics.set(productId, current);
      }
    }

    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return metrics;
}

async function updateOrderMetrics(
  shopProducts: Array<typeof products.$inferSelect>,
  orderMetrics: Map<string, { unitsSold30d: number; lastSaleAt: Date | null }>,
) {
  let updatedProducts = 0;

  for (const product of shopProducts) {
    const metric = orderMetrics.get(product.shopifyProductId);
    const lastSaleAt = metric?.lastSaleAt ?? null;

    await db
      .update(productMetrics)
      .set({
        daysSinceLastSale: lastSaleAt ? getAgeInDays(lastSaleAt) : 31,
        unitsSold30d: metric?.unitsSold30d ?? 0,
      })
      .where(eq(productMetrics.productId, product.id));

    updatedProducts += 1;
  }

  return updatedProducts;
}

function createOfflineSession(input: {
  accessToken: string;
  scope: string | null;
  shopDomain: string;
  state: string;
}) {
  return new Session({
    id: `offline_${input.shopDomain}`,
    shop: input.shopDomain,
    state: input.state,
    isOnline: false,
    accessToken: input.accessToken,
    ...(input.scope ? { scope: input.scope } : {}),
  });
}

function getAgeInDays(value: string | Date | null | undefined) {
  if (!value) {
    return 0;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const ageMs = Date.now() - date.getTime();

  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 0;
  }

  return Math.floor(ageMs / (24 * 60 * 60 * 1000));
}

function toProductStatus(status: string): "active" | "draft" | "archived" {
  const normalized = status.toLowerCase();

  if (normalized === "draft" || normalized === "archived") {
    return normalized;
  }

  return "active";
}

function buildStructureDeckProductInput(title: string, year: number, index: number) {
  const handle = slugify(title);
  const productType = getDeckProductType(title);
  const price = index < 5 ? 24.99 : 14.99;

  return {
    title,
    handle,
    descriptionHtml:
      "Structure Deck product for Arcana Vault. Imported through the embedded app because CSV upload is unavailable on trial stores.",
    vendor: "Yu-Gi-Oh! TCG",
    productType,
    tags: ["Yu-Gi-Oh", "Structure Deck", String(year), productType],
    status: "ACTIVE",
    productOptions: [
      {
        name: "Edition",
        position: 1,
        values: [{ name: "Structure Deck" }],
      },
    ],
    variants: [
      {
        optionValues: [
          {
            optionName: "Edition",
            name: "Structure Deck",
          },
        ],
        price,
        sku: `SD-${year}-${String(index + 1).padStart(3, "0")}`,
      },
    ],
  };
}

async function addStructureDeckImage(
  client: InstanceType<typeof shopify.clients.Graphql>,
  productId: string,
  title: string,
) {
  const response = (await client.request<ProductCreateMediaResponse>(
    productCreateMediaMutation,
    {
      variables: {
        productId,
        media: [
          {
            alt: `${title} placeholder image`,
            mediaContentType: "IMAGE",
            originalSource: getDeckPlaceholderUrl(title),
          },
        ],
      },
    },
  )) as { data?: ProductCreateMediaResponse };
  const result = response.data?.productCreateMedia;

  if (!result) {
    return {
      imageUrl: null,
      errors: ["Shopify returned no productCreateMedia result."],
    };
  }

  return {
    imageUrl: result.product?.featuredImage?.url ?? getDeckPlaceholderUrl(title),
    errors: result.mediaUserErrors.map((error) =>
      formatShopifyUserError(error.field, error.message),
    ),
    isTrialFileUploadBlocked: result.mediaUserErrors.some((error) =>
      error.message.toLowerCase().includes("not supported on trial accounts"),
    ),
  };
}

async function getOnlineStorePublicationId(
  client: InstanceType<typeof shopify.clients.Graphql>,
) {
  try {
    const response = (await client.request<PublicationsResponse>(
      publicationsQuery,
    )) as { data?: PublicationsResponse };
    const publications = response.data?.publications.nodes ?? [];
    const onlineStorePublication =
      publications.find((publication) => publication.name === "Online Store") ??
      publications.find((publication) =>
        publication.name.toLowerCase().includes("online store"),
      );

    if (!onlineStorePublication) {
      return {
        publicationId: null,
        errors: ["Online Store publication was not found."],
      };
    }

    return {
      publicationId: onlineStorePublication.id,
      errors: [],
    };
  } catch (error) {
    return {
      publicationId: null,
      errors: [
        error instanceof Error
          ? error.message
          : "Could not read Shopify publications.",
      ],
    };
  }
}

async function publishProduct(
  client: InstanceType<typeof shopify.clients.Graphql>,
  productId: string,
  publicationId: string,
) {
  const response = (await client.request<PublishablePublishResponse>(
    publishablePublishMutation,
    {
      variables: {
        id: productId,
        input: [
          {
            publicationId,
          },
        ],
      },
    },
  )) as { data?: PublishablePublishResponse };
  const result = response.data?.publishablePublish;

  if (!result) {
    return ["Shopify returned no publishablePublish result."];
  }

  return result.userErrors.map((error) =>
    formatShopifyUserError(error.field, error.message),
  );
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

function getDeckPlaceholderUrl(title: string) {
  const label = encodeURIComponent(title).replaceAll("%20", "+");

  return `https://placehold.co/640x640/140f1f/fff7df.png?text=${label}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatShopifyUserError(field: string[] | null, message: string) {
  if (!field || field.length === 0) {
    return message;
  }

  return `${field.join(".")}: ${message}`;
}

function hasScope(scope: string | null, targetScope: string) {
  return Boolean(
    scope
      ?.split(",")
      .map((item) => item.trim())
      .includes(targetScope),
  );
}
