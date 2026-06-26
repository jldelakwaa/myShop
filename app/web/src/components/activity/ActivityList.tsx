import { BlockStack, Box, EmptyState, Text } from "@shopify/polaris";

import type { ActivityLog } from "../../types/dashboard";
import { titleize } from "../../utils/format";

type ActivityListProps = {
  activity: ActivityLog[];
};

export function ActivityList({ activity }: ActivityListProps) {
  if (activity.length === 0) {
    return (
      <EmptyState
        heading="No activity yet"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>System and merchant events will appear here.</p>
      </EmptyState>
    );
  }

  return (
    <BlockStack gap="300">
      {activity.map((item) => (
        <Box
          borderColor="border"
          borderInlineStartWidth="025"
          key={item.id}
          paddingInlineStart="300"
        >
          <Text as="p" fontWeight="semibold">
            {titleize(item.eventType)}
          </Text>
          <Text as="p" tone="subdued">
            {item.message}
          </Text>
        </Box>
      ))}
    </BlockStack>
  );
}
