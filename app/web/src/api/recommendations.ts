import { apiClient, withShopParam } from "./client";
import type { Recommendation, RecommendationStatus } from "../types/dashboard";

export function generateRecommendations(shop?: string | null) {
  return apiClient.post<{
    ok: true;
    recommendations: number;
  }>(withShopParam("/api/recommendations/generate", shop));
}

export function updateRecommendationStatus(
  id: number,
  status: RecommendationStatus,
) {
  return apiClient.patch<{
    ok: true;
    recommendation: Recommendation;
  }>(`/api/recommendations/${id}`, { status });
}
