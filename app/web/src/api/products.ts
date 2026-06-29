import { apiClient, withShopParam } from "./client";

export function syncProducts(shop: string) {
  return apiClient.post<{
    ok: true;
    products: number;
  }>(withShopParam("/api/products/sync", shop));
}
