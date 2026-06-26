import {
  Badge,
  BlockStack,
  Card,
  Checkbox,
  Divider,
  InlineGrid,
  InlineStack,
  RangeSlider,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import type { RuleDraft } from "../../types/rules";

type RuleFormProps = {
  rule: RuleDraft;
  onChange: <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) => void;
};

const strategyOptions = [
  { label: "Balanced", value: "balanced" },
  { label: "Protect inventory", value: "inventory" },
  { label: "Clear stale stock", value: "clearance" },
  { label: "Feature winners", value: "growth" },
];

export function RuleForm({ rule, onChange }: RuleFormProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Rule setup
            </Text>
            <Text as="p" tone="subdued">
              Tune how Signal Shelf scores product opportunities.
            </Text>
          </BlockStack>
          <Badge tone={rule.isActive ? "success" : undefined}>
            {rule.isActive ? "Active" : "Paused"}
          </Badge>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <TextField
            autoComplete="off"
            label="Rule name"
            value={rule.name}
            onChange={(value) => onChange("name", value)}
          />

          <Select
            label="Strategy"
            options={strategyOptions}
            value={rule.strategy}
            onChange={(value) =>
              onChange("strategy", value as RuleDraft["strategy"])
            }
          />
        </InlineGrid>

        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <TextField
            autoComplete="off"
            label="Low-stock threshold"
            type="number"
            value={String(rule.lowStockThreshold)}
            onChange={(value) => onChange("lowStockThreshold", Number(value))}
          />

          <TextField
            autoComplete="off"
            label="Stale stock days"
            type="number"
            value={String(rule.staleStockDays)}
            onChange={(value) => onChange("staleStockDays", Number(value))}
          />
        </InlineGrid>

        <Divider />

        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Score weights
          </Text>

          <WeightSlider
            label="Inventory risk"
            value={rule.inventoryRiskWeight}
            onChange={(value) => onChange("inventoryRiskWeight", value)}
          />
          <WeightSlider
            label="Stale stock"
            value={rule.staleStockWeight}
            onChange={(value) => onChange("staleStockWeight", value)}
          />
          <WeightSlider
            label="Sell-through"
            value={rule.sellThroughWeight}
            onChange={(value) => onChange("sellThroughWeight", value)}
          />
          <WeightSlider
            label="Margin"
            value={rule.marginWeight}
            onChange={(value) => onChange("marginWeight", value)}
          />
        </BlockStack>

        <Checkbox
          label="Use this rule for scoring"
          checked={rule.isActive}
          onChange={(checked) => onChange("isActive", checked)}
        />
      </BlockStack>
    </Card>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <RangeSlider
      label={`${label}: ${value}`}
      min={0}
      max={50}
      value={value}
      onChange={(nextValue) => onChange(Number(nextValue))}
    />
  );
}
