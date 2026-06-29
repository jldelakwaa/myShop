import { apiClient, withShopParam } from "./client";
import type { ActivityLog } from "../types/dashboard";

export function fetchActivity(shop?: string | null) {
  return apiClient.get<{
    ok: true;
    activity: ActivityLog[];
  }>(withShopParam("/api/activity", shop));
}
