import {
  Badge,
  BlockStack,
  Box,
  EmptyState,
  InlineStack,
  Text,
} from "@shopify/polaris";

import type { Recommendation } from "../../types/dashboard";
import { titleize } from "../../utils/format";
import PriorityBadge from "../badge/PriorityBadge";
import StatusBadge from "../badge/StatusBadge";
import RecommendationActions from "./RecommendationAction";

type RecommendationListProps = {
  recommendations: Recommendation[];
  updatingId?: number | null;
  onAccept?: (id: number) => void;
  onDismiss?: (id: number) => void;
  onReopen?: (id: number) => void;
};

export function RecommendationList({
  recommendations,
  updatingId,
  onAccept,
  onDismiss,
  onReopen,
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <EmptyState
        heading="No open signals"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>New recommendations will appear after the next scoring run.</p>
      </EmptyState>
    );
  }

  return (
    <BlockStack gap="300">
      {recommendations.map((recommendation) => (
        <Box
          background="bg-surface-secondary"
          borderColor="border"
          borderRadius="200"
          borderWidth="025"
          key={recommendation.id}
          padding="400"
        >
          <InlineStack align="space-between" blockAlign="start" gap="400">
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h3" variant="headingSm">
                  {recommendation.title}
                </Text>
                <PriorityBadge priority={recommendation.priority} />
                <StatusBadge status={recommendation.status} />
              </InlineStack>
              {recommendation.reason ? (
                <Text as="p" tone="subdued">
                  {recommendation.reason}
                </Text>
              ) : null}
              <Badge tone="info">
                {titleize(recommendation.recommendationType)}
              </Badge>
            </BlockStack>
            <BlockStack gap="300" inlineAlign="end">
              <Box minWidth="48px">
                <Text as="p" alignment="end" variant="headingLg">
                  {recommendation.score}
                </Text>
              </Box>
              {onAccept || onDismiss ? (
                <RecommendationActions
                  id={recommendation.id}
                  status={recommendation.status}
                  isUpdating={updatingId === recommendation.id}
                  onAccept={onAccept}
                  onDismiss={onDismiss}
                  onReopen={onReopen}
                />
              ) : null}
            </BlockStack>
          </InlineStack>
        </Box>
      ))}
    </BlockStack>
  );
}