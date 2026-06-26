import { useEffect, useState } from "react";
import { BlockStack, Button, Card, Page } from "@shopify/polaris";

import { fetchActivity } from "../api/activity";
import { seedDemoData } from "../api/dashboard";
import { ActivityList } from "../components/activity/ActivityList";
import { StatePanel } from "../components/StatePanel";
import type { ActivityLog } from "../types/dashboard";

type PageState =
  | { status: "loading" }
  | { status: "ready"; activity: ActivityLog[] }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

function getFailedPageState(error: unknown): PageState {
  const message =
    error instanceof Error ? error.message : "Activity request failed.";

  if (message.toLowerCase().includes("shop not found")) {
    return {
      status: "empty",
      message: "Seed demo data to create activity history.",
    };
  }

  return { status: "error", message };
}

export function ActivityPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [isSeeding, setIsSeeding] = useState(false);

  async function loadActivity() {
    try {
      const data = await fetchActivity();
      setPageState({ status: "ready", activity: data.activity });
    } catch (error) {
      setPageState(getFailedPageState(error));
    }
  }

  async function handleSeedDemoData() {
    setIsSeeding(true);

    try {
      await seedDemoData();
      await loadActivity();
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

  useEffect(() => {
    let isActive = true;

    async function loadInitialActivity() {
      try {
        const data = await fetchActivity();

        if (isActive) {
          setPageState({ status: "ready", activity: data.activity });
        }
      } catch (error) {
        if (isActive) {
          setPageState(getFailedPageState(error));
        }
      }
    }

    void loadInitialActivity();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Page
      title="Activity"
      subtitle="Track rule changes, scoring runs, and merchant actions."
      primaryAction={
        <Button loading={isSeeding} onClick={handleSeedDemoData} variant="primary">
          Seed demo
        </Button>
      }
    >
      {pageState.status === "loading" ? (
        <StatePanel isLoading title="Loading activity" />
      ) : null}

      {pageState.status === "empty" ? (
        <StatePanel
          title="No activity yet"
          message={pageState.message}
          actionLabel={isSeeding ? "Seeding..." : "Seed demo data"}
          onAction={handleSeedDemoData}
        />
      ) : null}

      {pageState.status === "error" ? (
        <StatePanel
          title="Activity unavailable"
          message={pageState.message}
          actionLabel="Retry"
          onAction={loadActivity}
          tone="critical"
        />
      ) : null}

      {pageState.status === "ready" ? (
        <BlockStack gap="400">
          <Card>
            <ActivityList activity={pageState.activity} />
          </Card>
        </BlockStack>
      ) : null}
    </Page>
  );
}
