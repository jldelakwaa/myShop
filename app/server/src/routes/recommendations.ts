import { eq } from "drizzle-orm";
import { Router, type Router as ExpressRouter } from "express";

import { db } from "../db/index.js";
import { signalRecommendations } from "../db/schema.js";
import { logActivity } from "../services/activity.js";

export const recommendationsRouter: ExpressRouter = Router();

const allowedStatuses = ["open", "accepted", "dismissed"] as const;

recommendationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const recommendationId = Number(req.params.id);
    const status = req.body.status;

    if (!Number.isInteger(recommendationId)) {
      res.status(400).json({
        ok: false,
        error: "Invalid recommendation id.",
      });
      return;
    }

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        ok: false,
        error: "Status must be open, accepted, or dismissed.",
      });
      return;
    }

    // Check if the recommendation exists
    const [existing] = await db
      .select()
      .from(signalRecommendations)
      .where(eq(signalRecommendations.id, recommendationId))
      .limit(1);

    if (!existing) {
      res.status(404).json({
        ok: false,
        error: "Recommendation not found.",
      });
      return;
    }

    // Update the recommendation status
    await db
      .update(signalRecommendations)
      .set({
        status,
      })
      .where(eq(signalRecommendations.id, recommendationId));

    const [updated] = await db
      .select()
      .from(signalRecommendations)
      .where(eq(signalRecommendations.id, recommendationId))
      .limit(1);

    const statusLabel =
      status === "open" ? "reopened" : status;

    await logActivity({
      shopId: existing.shopId,
      actorType: "merchant",
      eventType: `recommendation_${status}`,
      message: `Recommendation "${existing.title}" was ${statusLabel}.`,
      metadata: {
        recommendationId,
        previousStatus: existing.status,
        nextStatus: status,
      },
    });

    res.json({
      ok: true,
      recommendation: updated,
    });
  } catch (error) {
    next(error);
  }
});
