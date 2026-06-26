import { BlockStack, Card, Toast } from "@shopify/polaris";

import type { Recommendation, RecommendationStatus } from "../../types/dashboard";
import { RecommendationList } from "./RecommendationList";

type RecommendationsReadyStateProps = {
  recommendations: Recommendation[];
  updatingId: number | null;
  toastMessage: string | null;
  onToastDismiss: () => void;
  onStatusChange: (id: number, status: RecommendationStatus) => void;
};

export function RecommendationsReadyState({
  recommendations,
  updatingId,
  toastMessage,
  onToastDismiss,
  onStatusChange,
}: RecommendationsReadyStateProps) {
  return (
    <BlockStack gap="400">
      {toastMessage ? (
        <Toast content={toastMessage} onDismiss={onToastDismiss} />
      ) : null}

      <Card>
        <RecommendationList
          recommendations={recommendations}
          updatingId={updatingId}
          onAccept={(id) => onStatusChange(id, "accepted")}
          onDismiss={(id) => onStatusChange(id, "dismissed")}
          onReopen={(id) => onStatusChange(id, "open")}
        />
      </Card>
    </BlockStack>
  );
}
