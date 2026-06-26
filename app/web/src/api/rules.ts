import { apiClient } from "./client";
import type { RuleDraft, RuleRecord } from "../types/rules";

export function fetchRules() {
  return apiClient.get<{
    ok: true;
    rules: RuleRecord[];
  }>("/api/rules");
}

export function createRule(rule: RuleDraft) {
  return apiClient.post<{
    ok: true;
    rule: RuleRecord;
  }>("/api/rules", rule);
}

export function updateRule(id: number, rule: RuleDraft) {
  return apiClient.put<{
    ok: true;
    rule: RuleRecord;
  }>(`/api/rules/${id}`, rule);
}
