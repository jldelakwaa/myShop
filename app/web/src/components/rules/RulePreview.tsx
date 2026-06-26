import { BlockStack, Card, InlineGrid, Text } from "@shopify/polaris";

import type { RuleDraft } from "../../types/rules";

type RulePreviewProps = {
  rule: RuleDraft | null;
};

export function RulePreview({ rule }: RulePreviewProps) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Saved rule preview
        </Text>

        {rule ? (
          <InlineGrid columns={{ xs: 1, md: 4 }} gap="300">
            <PreviewMetric label="Low stock" value={rule.lowStockThreshold} />
            <PreviewMetric label="Stale days" value={rule.staleStockDays} />
            <PreviewMetric
              label="Inventory weight"
              value={rule.inventoryRiskWeight}
            />
            <PreviewMetric
              label="Sell-through weight"
              value={rule.sellThroughWeight}
            />
          </InlineGrid>
        ) : (
          <Text as="p" tone="subdued">
            Save a rule to preview it here.
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <BlockStack gap="100">
      <Text as="p" tone="subdued" variant="bodySm">
        {label}
      </Text>
      <Text as="p" variant="headingLg">
        {value}
      </Text>
    </BlockStack>
  );
}
