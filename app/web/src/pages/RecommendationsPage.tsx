import { useEffect, useState } from "react";
import { Button, Page } from "@shopify/polaris";

import { fetchDashboard, seedDemoData } from "../api/dashboard";
import { updateRecommendationStatus } from "../api/recommendations";
import { RecommendationsReadyState } from "../components/recommendations/RecommendationsReadyState";
import { StatePanel } from "../components/StatePanel";
import type { DashboardData, RecommendationStatus } from "../types/dashboard";

type PageState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

function getFailedPageState(error: unknown): PageState {
  const message =
    error instanceof Error ? error.message : "Recommendations request failed.";

  if (message.toLowerCase().includes("seed demo data")) {
    return { status: "empty", message };
  }

  return { status: "error", message };
}

export function RecommendationsPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [isSeeding, setIsSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function loadRecommendations() {
    try {
      const data = await fetchDashboard();
      setPageState({ status: "ready", data });
    } catch (error) {
      setPageState(getFailedPageState(error));
    }
  }

  async function handleSeedDemoData() {
    setIsSeeding(true);

    try {
      await seedDemoData();
      await loadRecommendations();
    } catch (error) {
      setPageState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Seed request failed.",
      });
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleRecommendationStatusChange(
    id: number,
    status: RecommendationStatus,
  ) {
    setUpdatingId(id);

    try {
      const result = await updateRecommendationStatus(id, status);

      setPageState((current) => {
        if (current.status !== "ready") {
          return current;
        }

        return {
          status: "ready",
          data: {
            ...current.data,
            recommendations: current.data.recommendations.map((recommendation) =>
              recommendation.id === id ? result.recommendation : recommendation,
            ),
          },
        };
      });

      setToastMessage(
        status === "open"
          ? "Recommendation reopened and saved."
          : status === "accepted"
            ? "Recommendation accepted and saved."
            : "Recommendation dismissed and saved.",
      );
    } catch (error) {
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Recommendation update failed.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialRecommendations() {
      try {
        const data = await fetchDashboard();

        if (isActive) {
          setPageState({ status: "ready", data });
        }
      } catch (error) {
        if (isActive) {
          setPageState(getFailedPageState(error));
        }
      }
    }

    void loadInitialRecommendations();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Page
      title="Recommendations"
      subtitle="Review ranked product actions."
      primaryAction={
        <Button loading={isSeeding} onClick={handleSeedDemoData} variant="primary">
          Seed demo
        </Button>
      }
    >
      {pageState.status === "loading" ? (
        <StatePanel isLoading title="Loading recommendations" />
      ) : null}

      {pageState.status === "empty" ? (
        <StatePanel
          title="No recommendations yet"
          message={pageState.message}
          actionLabel={isSeeding ? "Seeding..." : "Seed demo data"}
          onAction={handleSeedDemoData}
        />
      ) : null}

      {pageState.status === "error" ? (
        <StatePanel
          title="Recommendations unavailable"
          message={pageState.message}
          actionLabel="Retry"
          onAction={loadRecommendations}
          tone="critical"
        />
      ) : null}

      {pageState.status === "ready" ? (
        <RecommendationsReadyState
          recommendations={pageState.data.recommendations}
          updatingId={updatingId}
          toastMessage={toastMessage}
          onToastDismiss={() => setToastMessage(null)}
          onStatusChange={(id, status) =>
            void handleRecommendationStatusChange(id, status)
          }
        />
      ) : null}
    </Page>
  );
}
