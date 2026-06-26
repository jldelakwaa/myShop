import { Banner, BlockStack, Button, Card, Spinner, Text } from "@shopify/polaris";

type StatePanelProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  isLoading?: boolean;
  tone?: "critical" | "info";
  onAction?: () => void;
};

export function StatePanel({
  title,
  message,
  actionLabel,
  isLoading,
  tone = "info",
  onAction,
}: StatePanelProps) {
  if (isLoading) {
    return (
      <Card>
        <BlockStack align="center" gap="300" inlineAlign="center">
          <Spinner accessibilityLabel={title} size="large" />
          <Text as="p" tone="subdued">
            {title}
          </Text>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Banner title={title} tone={tone}>
      <BlockStack gap="300">
        {message ? <p>{message}</p> : null}
        {actionLabel && onAction ? (
          <Button onClick={onAction}>{actionLabel}</Button>
        ) : null}
      </BlockStack>
    </Banner>
  );
}
