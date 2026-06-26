import { Badge} from "@shopify/polaris";
import type { Recommendation } from "../../types/dashboard";

function PriorityBadge({ priority }: { priority: Recommendation["priority"] }) {
  if (priority === "critical" || priority === "high") {
    return <Badge tone="critical">{priority}</Badge>;
  }

  if (priority === "medium") {
    return <Badge tone="attention">{priority}</Badge>;
  }

  return <Badge>{priority}</Badge>;
}

export default PriorityBadge