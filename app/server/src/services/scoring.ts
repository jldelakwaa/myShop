import type { productMetrics, signalRules } from "../db/schema.js";

type ProductMetric = typeof productMetrics.$inferSelect;
type SignalRule = typeof signalRules.$inferSelect;

export function scoreProduct(metric: ProductMetric, rule: SignalRule) {
  const inventoryRisk =
    metric.inventoryQuantity <= rule.lowStockThreshold
      ? rule.inventoryRiskWeight
      : 0;

  const staleStock =
    metric.inventoryAgeDays >= rule.staleStockDays
      ? rule.staleStockWeight
      : 0;

  const sellThrough = Math.min(metric.unitsSold30d, 30) / 30;
  const conversion = Number(metric.conversionRate);
  const margin = Number(metric.grossMargin);

  const score =
    inventoryRisk +
    staleStock +
    Math.round(sellThrough * rule.sellThroughWeight) +
    Math.round(conversion * rule.conversionWeight) +
    Math.round(margin * rule.marginWeight);

  return Math.max(0, Math.min(score, 100));
}

export function getPriority(score: number) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}
