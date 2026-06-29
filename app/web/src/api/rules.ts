import { apiClient, withShopParam } from "./client";
import type { RuleDraft, RuleRecord } from "../types/rules";

export function fetchRules(shop?: string | null) {
  return apiClient.get<{
    ok: true;
    rules: RuleRecord[];
  }>(withShopParam("/api/rules", shop));
}

export function createRule(rule: RuleDraft, shop?: string | null) {
  return apiClient.post<{
    ok: true;
    rule: RuleRecord;
  }>(withShopParam("/api/rules", shop), rule);
}

export function updateRule(id: number, rule: RuleDraft) {
  return apiClient.put<{
    ok: true;
    rule: RuleRecord;
  }>(`/api/rules/${id}`, rule);
}
