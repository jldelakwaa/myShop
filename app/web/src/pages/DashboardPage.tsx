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
import { syncProducts, syncSalesMetrics } from "../api/products";
import { generateRecommendations } from "../api/recommendations";
import { ActivityList } from "../components/activity/ActivityList";
import { MetricCard } from "../components/MetricCard";
import { RecommendationList } from "../components/recommendations/RecommendationList";
import { StatePanel } from "../components/StatePanel";
import type { LoadState } from "../types/dashboard";
import { useShopParam } from "../hooks/useShopParam";
import { formatRelativeTime } from "../utils/format";
import { localThemePreviewUrl } from "../utils/themeLinks";


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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingSales, setIsSyncingSales] = useState(false);
  const [isRunningFullSync, setIsRunningFullSync] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const connectedShop = useShopParam();

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchDashboard(connectedShop);
      setLoadState({ status: "ready", data });
    } catch (error) {
      setLoadState(getFailedLoadState(error));
    }
  }, [connectedShop]);

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

  const handleSyncProducts = useCallback(async () => {
    if (!connectedShop) {
      return;
    }

    setIsSyncing(true);

    try {
      await syncProducts(connectedShop);
      await loadDashboard();
    } catch (error) {
      setLoadState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Product sync failed.",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [connectedShop, loadDashboard]);

  const handleSyncSalesMetrics = useCallback(async () => {
    if (!connectedShop) {
      return;
    }

    setIsSyncingSales(true);

    try {
      await syncSalesMetrics(connectedShop);
      await loadDashboard();
    } catch (error) {
      setLoadState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Sales sync failed.",
      });
    } finally {
      setIsSyncingSales(false);
    }
  }, [connectedShop, loadDashboard]);

  const handleRunFullSync = useCallback(async () => {
    if (!connectedShop) {
      return;
    }

    setIsRunningFullSync(true);
    setSyncNotice(null);

    try {
      const productsResult = await syncProducts(connectedShop);
      const salesResult = await syncSalesMetrics(connectedShop);
      const recommendationsResult = await generateRecommendations(connectedShop);

      await loadDashboard();
      setSyncNotice(
        `Full sync complete: ${productsResult.products} products, ${salesResult.products} sales metrics, ${recommendationsResult.recommendations} recommendations.`,
      );
    } catch (error) {
      setLoadState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Full sync failed.",
      });
    } finally {
      setIsRunningFullSync(false);
    }
  }, [connectedShop, loadDashboard]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialDashboard() {
      try {
        const data = await fetchDashboard(connectedShop);

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
  }, [connectedShop]);

  const primaryAction = useMemo(
    () => (
      <Button
        loading={connectedShop ? isRunningFullSync : isSeeding}
        onClick={connectedShop ? handleRunFullSync : handleSeedDemoData}
        variant="primary"
      >
        {connectedShop ? "Run full sync" : "Seed demo"}
      </Button>
    ),
    [
      connectedShop,
      handleSeedDemoData,
      handleRunFullSync,
      isSeeding,
      isRunningFullSync,
    ],
  );

  function openThemePreview() {
    window.open(localThemePreviewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Page
      title="Signal Shelf"
      subtitle="Merchandising signals for Arcana Vault"
      primaryAction={primaryAction}
      secondaryActions={
        [
          {
            content: "Open theme",
            onAction: openThemePreview,
          },
          ...(connectedShop
            ? [
              {
                content: "Sync products",
                loading: isSyncing,
                onAction: handleSyncProducts,
              },
              {
                content: "Sync sales",
                loading: isSyncingSales,
                onAction: handleSyncSalesMetrics,
              },
            ]
            : []),
        ]
      }
    >
      {loadState.status === "loading" ? (
        <StatePanel isLoading title="Loading dashboard" />
      ) : null}

      {connectedShop ? (
        <Banner tone="success">
          <p>Connected to {connectedShop}</p>
        </Banner>
      ) : null}

      {syncNotice ? (
        <Banner tone="success" onDismiss={() => setSyncNotice(null)}>
          <p>{syncNotice}</p>
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

        <SyncStatusCard syncStatus={data.syncStatus} />

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

function SyncStatusCard({
  syncStatus,
}: {
  syncStatus: Extract<LoadState, { status: "ready" }>["data"]["syncStatus"];
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Sync status
            </Text>
            <Text as="p" tone="subdued">
              Latest data refreshes used by scoring.
            </Text>
          </BlockStack>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <SyncStatusItem
            label="Products"
            value={syncStatus.productsSyncedAt}
          />
          <SyncStatusItem label="Sales" value={syncStatus.salesSyncedAt} />
          <SyncStatusItem
            label="Signals"
            value={syncStatus.recommendationsGeneratedAt}
          />
        </InlineGrid>
      </BlockStack>
    </Card>
  );
}

function SyncStatusItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <BlockStack gap="050">
      <Text as="p" tone="subdued" variant="bodySm">
        {label}
      </Text>
      <Text as="p" variant="headingMd">
        {formatRelativeTime(value)}
      </Text>
    </BlockStack>
  );
}
