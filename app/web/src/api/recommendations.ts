import { apiClient } from "./client";
import type { Recommendation, RecommendationStatus } from "../types/dashboard";

export function updateRecommendationStatus(
  id: number,
  status: RecommendationStatus,
) {
  return apiClient.patch<{
    ok: true;
    recommendation: Recommendation;
  }>(`/api/recommendations/${id}`, { status });
}
