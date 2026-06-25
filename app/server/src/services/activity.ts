import { activityLogs } from "../db/schema.js";
import { db } from "../db/index.js";

type ActivityActor = "merchant" | "system";

export async function logActivity(input: {
  shopId: number;
  eventType: string;
  message: string;
  actorType?: ActivityActor;
  metadata?: unknown;
}) {
  await db.insert(activityLogs).values({
    shopId: input.shopId,
    actorType: input.actorType ?? "system",
    eventType: input.eventType,
    message: input.message,
    metadata: input.metadata,
  });
}
