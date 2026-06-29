import { apiClient, withShopParam } from "./client";
import type { DashboardData } from "../types/dashboard";

export function fetchDashboard(shop?: string | null) {
  return apiClient.get<DashboardData>(withShopParam("/api/dashboard", shop));
}

export function seedDemoData() {
  return apiClient.post<{
    ok: true;
    shop: string;
    products: number;
    recommendations: number;
  }>("/api/dev/seed");
}
