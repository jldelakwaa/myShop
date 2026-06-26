import { Badge} from "@shopify/polaris";
import type { Recommendation } from "../../types/dashboard";

function StatusBadge({ status }: { status: Recommendation["status"] }) {
  if (status === "accepted") {
    return <Badge tone="success">{status}</Badge>;
  }

  if (status === "dismissed") {
    return <Badge tone="critical">{status}</Badge>;
  }

  return <Badge>{status}</Badge>;
}

export default StatusBadge