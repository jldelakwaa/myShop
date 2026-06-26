export type RuleStrategy = "balanced" | "inventory" | "clearance" | "growth";

export type RuleDraft = {
  name: string;
  strategy: RuleStrategy;
  lowStockThreshold: number;
  staleStockDays: number;
  inventoryRiskWeight: number;
  staleStockWeight: number;
  sellThroughWeight: number;
  marginWeight: number;
  isActive: boolean;
};

export type RuleRecord = RuleDraft & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export const defaultRule: RuleDraft = {
  name: "Default merchandising signal",
  strategy: "balanced",
  lowStockThreshold: 10,
  staleStockDays: 60,
  inventoryRiskWeight: 25,
  staleStockWeight: 20,
  sellThroughWeight: 20,
  marginWeight: 15,
  isActive: true,
};

export function toRuleDraft(rule: RuleRecord): RuleDraft {
  return {
    name: rule.name,
    strategy: rule.strategy,
    lowStockThreshold: rule.lowStockThreshold,
    staleStockDays: rule.staleStockDays,
    inventoryRiskWeight: rule.inventoryRiskWeight,
    staleStockWeight: rule.staleStockWeight,
    sellThroughWeight: rule.sellThroughWeight,
    marginWeight: rule.marginWeight,
    isActive: rule.isActive,
  };
}
