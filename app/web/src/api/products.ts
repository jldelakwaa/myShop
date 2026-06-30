import { apiClient, withShopParam } from "./client";

export type ProductMetric = {
  id: number;
  productId: number;
  inventoryQuantity: number;
  reorderPoint: number;
  unitsSold30d: number;
  views30d: number;
  conversionRate: string;
  grossMargin: string;
  daysSinceLastSale: number;
  inventoryAgeDays: number;
  updatedAt: string;
};

export type ProductRecord = {
  id: number;
  shopId: number;
  shopifyProductId: string;
  title: string;
  handle: string | null;
  vendor: string | null;
  productType: string | null;
  status: "active" | "draft" | "archived";
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: ProductMetric | null;
};

export function fetchProducts(shop?: string | null) {
  return apiClient.get<{
    ok: true;
    shop: {
      id: number;
      shopDomain: string;
    };
    products: ProductRecord[];
  }>(withShopParam("/api/products", shop));
}

export function syncProducts(shop: string) {
  return apiClient.post<{
    ok: true;
    products: number;
  }>(withShopParam("/api/products/sync", shop));
}

export function syncSalesMetrics(shop: string) {
  return apiClient.post<{
    ok: true;
    products: number;
  }>(withShopParam("/api/products/sync-sales", shop));
}

export function seedShopifyStructureDecks(shop: string) {
  return apiClient.post<{
    ok: true;
    products: number;
    errors: Array<{
      title: string;
      message: string;
    }>;
  }>(withShopParam("/api/products/seed-shopify", shop));
}
