import { apiClient } from "./client";
import type { ActivityLog } from "../types/dashboard";

export function fetchActivity() {
  return apiClient.get<{
    ok: true;
    activity: ActivityLog[];
  }>("/api/activity");
}
