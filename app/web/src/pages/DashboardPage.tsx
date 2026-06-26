import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Text,
  Banner,
  Box,
} from "@shopify/polaris";

import { fetchDashboard, seedDemoData } from "../api/dashboard";
import { ActivityList } from "../components/activity/ActivityList";
import { MetricCard } from "../components/MetricCard";
import { RecommendationList } from "../components/recommendations/RecommendationList";
import { StatePanel } from "../components/StatePanel";
import type { LoadState } from "../types/dashboard";
import { useShopParam } from "../hooks/useShopParam";


function getFailedLoadState(error: unknown): LoadState {
  const message =
    error instanceof Error ? error.message : "Dashboard request failed.";

  if (message.toLowerCase().includes("seed demo data")) {
    return { status: "empty", message };
  }

  return { status: "error", message };
}

export function DashboardPage() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [isSeeding, setIsSeeding] = useState(false);
  const connectedShop = useShopParam();

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchDashboard();
      setLoadState({ status: "ready", data });
    } catch (error) {
      setLoadState(getFailedLoadState(error));
    }
  }, []);

  const handleSeedDemoData = useCallback(async () => {
    setIsSeeding(true);

    try {
      await seedDemoData();
      await loadDashboard();
    } catch (error) {
      setLoadState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Seed request failed.",
      });
    } finally {
      setIsSeeding(false);
    }
  }, [loadDashboard]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialDashboard() {
      try {
        const data = await fetchDashboard();

        if (isActive) {
          setLoadState({ status: "ready", data });
        }
      } catch (error) {
        if (isActive) {
          setLoadState(getFailedLoadState(error));
        }
      }
    }

    void loadInitialDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const primaryAction = useMemo(
    () => (
      <Button loading={isSeeding} onClick={handleSeedDemoData} variant="primary">
        Seed demo
      </Button>
    ),
    [handleSeedDemoData, isSeeding],
  );

  return (
    <Page
      title="Signal Shelf"
      subtitle="Merchandising signals for Lumen Loom"
      primaryAction={primaryAction}
    >
      {loadState.status === "loading" ? (
        <StatePanel isLoading title="Loading dashboard" />
      ) : null}

      {connectedShop ? (
        <Banner tone="success">
          <p>Connected to {connectedShop}</p>
        </Banner>
      ) : null}

      {loadState.status === "empty" ? (
        <StatePanel
          actionLabel={isSeeding ? "Seeding..." : "Seed demo data"}
          message={loadState.message}
          onAction={handleSeedDemoData}
          title="No demo data yet"
        />
      ) : null}

      {loadState.status === "error" ? (
        <StatePanel
          actionLabel="Retry"
          message={loadState.message}
          onAction={loadDashboard}
          title="Dashboard unavailable"
          tone="critical"
        />
      ) : null}

      {loadState.status === "ready" ? (
        <DashboardContent
          data={loadState.data}
          onRefresh={loadDashboard}
        />
      ) : null}
    </Page>
  );
}

function DashboardContent({
  data,
  onRefresh,
}: {
  data: Extract<LoadState, { status: "ready" }>["data"];
  onRefresh: () => void;
}) {
  return (
    <Box paddingBlockStart="400" paddingBlockEnd="400">
      <BlockStack gap="400">
        <InlineGrid columns={{ xs: 1, sm: 2, md: 5 }} gap="400">
          <MetricCard label="Products tracked" value={data.summary.products} />
          <MetricCard label="Active rules" value={data.summary.activeRules} />
          <MetricCard label="Low-stock risks" value={data.summary.lowStockCount} />
          <MetricCard label="Stale-stock risks" value={data.summary.staleStockCount} />
          <MetricCard
            label="Open recommendations"
            value={data.summary.openRecommendations}
          />
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Top signals
                    </Text>
                    <Text as="p" tone="subdued">
                      Ranked by merchandising urgency.
                    </Text>
                  </BlockStack>
                  <Button onClick={onRefresh}>Refresh</Button>
                </InlineStack>
                <RecommendationList recommendations={data.recommendations} />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Activity
                  </Text>
                  <Text as="p" tone="subdued">
                    Recent system and merchant events.
                  </Text>
                </BlockStack>
                <ActivityList activity={data.recentActivity} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Box>
  );
}
