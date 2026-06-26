import { Card, Text } from "@shopify/polaris";

type MetricCardProps = {
  label: string;
  value: number;
};

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card>
      <Text as="p" tone="subdued" variant="bodySm">
        {label}
      </Text>
      <Text as="p" variant="heading2xl">
        {value}
      </Text>
    </Card>
  );
}
