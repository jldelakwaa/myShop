import { apiClient } from "./client";
import type { DashboardData } from "../types/dashboard";

export function fetchDashboard() {
  return apiClient.get<DashboardData>("/api/dashboard");
}

export function seedDemoData() {
  return apiClient.post<{
    ok: true;
    shop: string;
    products: number;
    recommendations: number;
  }>("/api/dev/seed");
}
