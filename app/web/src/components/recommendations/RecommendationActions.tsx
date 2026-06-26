import { Button, InlineStack } from "@shopify/polaris";
import type { Recommendation } from "../../types/dashboard";

function RecommendationActions({
  id,
  status,
  isUpdating,
  onAccept,
  onDismiss,
  onReopen,
}: {
  id: number;
  status: Recommendation["status"];
  isUpdating: boolean;
  onAccept?: (id: number) => void;
  onDismiss?: (id: number) => void;
  onReopen?: (id: number) => void;
}) {

  return (
    <InlineStack gap="200" wrap={false}>
      {onAccept && status !== "accepted" && status !== "dismissed" ? (
        <Button
          tone="success"
          variant="primary"
          loading={isUpdating}
          disabled={isUpdating}
          onClick={() => onAccept(id)}
          size="slim"
        >
          Accept
        </Button>
      ) : null}

      {onDismiss && status !== "accepted" && status !== "dismissed" ? (
        <Button
          variant="secondary"
          loading={isUpdating}
          disabled={isUpdating}
          onClick={() => onDismiss(id)}
          size="slim"
        >
          Dismiss
        </Button>
      ) : null}

      {onReopen && status !== "open" ? (
        <Button 
          variant="secondary"
          disabled={isUpdating} 
          onClick={() => onReopen(id)} 
          size="slim"
        >
          Reopen
        </Button>
      ) : null}
    </InlineStack>
  );
}

export default RecommendationActions;