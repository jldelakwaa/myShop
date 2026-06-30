import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  BlockStack,
  Box,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Page,
  Banner,
  Text,
  Thumbnail,
} from "@shopify/polaris";

import {
  fetchProducts,
  seedShopifyStructureDecks,
  syncProducts,
  syncSalesMetrics,
  type ProductRecord,
} from "../api/products";
import { MetricCard } from "../components/MetricCard";
import { StatePanel } from "../components/StatePanel";
import { useShopParam } from "../hooks/useShopParam";

type PageState =
  | { status: "loading" }
  | { status: "ready"; products: ProductRecord[] }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

type SeedError = {
  title: string;
  message: string;
};

function getFailedPageState(error: unknown): PageState {
  const message =
    error instanceof Error ? error.message : "Products request failed.";

  if (message.toLowerCase().includes("shop not found")) {
    return {
      status: "empty",
      message: "Sync products or seed demo data to start tracking products.",
    };
  }

  return { status: "error", message };
}

export function ProductsPage() {
  const connectedShop = useShopParam();
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isSyncingSales, setIsSyncingSales] = useState(false);
  const [isSeedingShopify, setIsSeedingShopify] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [seedErrors, setSeedErrors] = useState<SeedError[]>([]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchProducts(connectedShop);

      setPageState({ status: "ready", products: data.products });
    } catch (error) {
      setPageState(getFailedPageState(error));
    }
  }, [connectedShop]);

  const handleSyncProducts = useCallback(async () => {
    if (!connectedShop) {
      return;
    }

    setIsSyncingProducts(true);

    try {
      await syncProducts(connectedShop);
      await loadProducts();
    } catch (error) {
      setPageState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Product sync failed.",
      });
    } finally {
      setIsSyncingProducts(false);
    }
  }, [connectedShop, loadProducts]);

  const handleSyncSales = useCallback(async () => {
    if (!connectedShop) {
      return;
    }

    setIsSyncingSales(true);

    try {
      await syncSalesMetrics(connectedShop);
      await loadProducts();
    } catch (error) {
      setPageState({
        status: "error",
        message: error instanceof Error ? error.message : "Sales sync failed.",
      });
    } finally {
      setIsSyncingSales(false);
    }
  }, [connectedShop, loadProducts]);

  const handleSeedShopifyProducts = useCallback(async () => {
    if (!connectedShop) {
      return;
    }

    setIsSeedingShopify(true);
    setNotice(null);
    setSeedErrors([]);

    try {
      const result = await seedShopifyStructureDecks(connectedShop);
      await loadProducts();
      setNotice(
        result.errors.length > 0
          ? `Created or updated ${result.products} Structure Deck products. ${result.errors.length} products need attention.`
          : `Created or updated ${result.products} Structure Deck products in Shopify.`,
      );
      setSeedErrors(result.errors);
    } catch (error) {
      setPageState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Shopify Structure Deck creation failed.",
      });
    } finally {
      setIsSeedingShopify(false);
    }
  }, [connectedShop, loadProducts]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialProducts() {
      try {
        const data = await fetchProducts(connectedShop);

        if (isActive) {
          setPageState({ status: "ready", products: data.products });
        }
      } catch (error) {
        if (isActive) {
          setPageState(getFailedPageState(error));
        }
      }
    }

    void loadInitialProducts();

    return () => {
      isActive = false;
    };
  }, [connectedShop]);

  const products = pageState.status === "ready" ? pageState.products : [];
  const summary = useMemo(() => getSummary(products), [products]);

  return (
    <Page
      title="Products"
      subtitle="Synced Shopify products and scoring inputs"
      primaryAction={
        connectedShop
          ? {
              content: "Sync products",
              loading: isSyncingProducts,
              onAction: handleSyncProducts,
            }
          : undefined
      }
      secondaryActions={
        connectedShop
          ? [
              {
                content: "Create Structure Decks",
                loading: isSeedingShopify,
                onAction: handleSeedShopifyProducts,
              },
              {
                content: "Sync sales",
                loading: isSyncingSales,
                onAction: handleSyncSales,
              },
            ]
          : undefined
      }
    >
      {pageState.status === "loading" ? (
        <StatePanel isLoading title="Loading products" />
      ) : null}

      {notice ? (
        <Banner
          tone={seedErrors.length > 0 ? "warning" : "success"}
          onDismiss={() => {
            setNotice(null);
            setSeedErrors([]);
          }}
        >
          <BlockStack gap="200">
            <p>{notice}</p>
            {seedErrors.length > 0 ? (
              <ul>
                {seedErrors.slice(0, 5).map((error) => (
                  <li key={`${error.title}-${error.message}`}>
                    {error.title}: {error.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </BlockStack>
        </Banner>
      ) : null}

      {pageState.status === "empty" ? (
        <StatePanel
          actionLabel={connectedShop ? "Sync products" : undefined}
          message={pageState.message}
          onAction={connectedShop ? handleSyncProducts : undefined}
          title="No products tracked"
        />
      ) : null}

      {pageState.status === "error" ? (
        <StatePanel
          actionLabel="Retry"
          message={pageState.message}
          onAction={loadProducts}
          title="Products unavailable"
          tone="critical"
        />
      ) : null}

      {pageState.status === "ready" ? (
        <BlockStack gap="400">
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <MetricCard label="Products tracked" value={summary.products} />
            <MetricCard label="Low stock" value={summary.lowStock} />
            <MetricCard label="Sold in 30d" value={summary.unitsSold30d} />
            <MetricCard label="No recent sale" value={summary.noRecentSale} />
          </InlineGrid>

          <Card>
            {products.length === 0 ? (
              <EmptyState
                heading="No products tracked"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Synced Shopify products will appear here.</p>
              </EmptyState>
            ) : (
              <BlockStack gap="0">
                {products.map((product, index) => (
                  <ProductRow
                    isLast={index === products.length - 1}
                    key={product.id}
                    product={product}
                  />
                ))}
              </BlockStack>
            )}
          </Card>
        </BlockStack>
      ) : null}
    </Page>
  );
}

function ProductRow({
  isLast,
  product,
}: {
  isLast: boolean;
  product: ProductRecord;
}) {
  const metrics = product.metrics;

  return (
    <Box
      borderBlockEndWidth={isLast ? undefined : "025"}
      borderColor="border"
      paddingBlock="400"
      paddingInline="400"
    >
      <InlineGrid columns={{ xs: 1, md: "2fr 1fr 1fr 1fr" }} gap="400">
        <InlineStack blockAlign="center" gap="300" wrap={false}>
          <Thumbnail
            alt={product.title}
            size="small"
            source={
              product.imageUrl ??
              "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            }
          />
          <Box minWidth="0">
            <BlockStack gap="100">
              <InlineStack blockAlign="center" gap="200" wrap={false}>
                <Text as="h3" variant="headingSm">
                  {product.title}
                </Text>
                <ProductStatusBadge status={product.status} />
              </InlineStack>
              <Text as="p" tone="subdued" variant="bodySm">
                {[product.vendor, product.productType, product.handle]
                  .filter(Boolean)
                  .join(" / ") || "No product details"}
              </Text>
            </BlockStack>
          </Box>
        </InlineStack>

        <MetricGroup
          label="Inventory"
          primary={`${metrics?.inventoryQuantity ?? 0}`}
          secondary={`Reorder at ${metrics?.reorderPoint ?? 10}`}
        />
        <MetricGroup
          label="Sales"
          primary={`${metrics?.unitsSold30d ?? 0}`}
          secondary="Units sold 30d"
        />
        <MetricGroup
          label="Freshness"
          primary={`${metrics?.daysSinceLastSale ?? 0}d`}
          secondary={`${metrics?.inventoryAgeDays ?? 0}d inventory age`}
        />
      </InlineGrid>
    </Box>
  );
}

function MetricGroup({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <BlockStack gap="050">
      <Text as="p" tone="subdued" variant="bodySm">
        {label}
      </Text>
      <Text as="p" variant="headingMd">
        {primary}
      </Text>
      <Text as="p" tone="subdued" variant="bodySm">
        {secondary}
      </Text>
    </BlockStack>
  );
}

function ProductStatusBadge({ status }: { status: ProductRecord["status"] }) {
  if (status === "active") {
    return <Badge tone="success">Active</Badge>;
  }

  if (status === "draft") {
    return <Badge>Draft</Badge>;
  }

  return <Badge tone="attention">Archived</Badge>;
}

function getSummary(products: ProductRecord[]) {
  return products.reduce(
    (summary, product) => {
      const metrics = product.metrics;

      summary.products += 1;
      summary.unitsSold30d += metrics?.unitsSold30d ?? 0;

      if ((metrics?.inventoryQuantity ?? 0) <= (metrics?.reorderPoint ?? 10)) {
        summary.lowStock += 1;
      }

      if ((metrics?.daysSinceLastSale ?? 0) >= 30) {
        summary.noRecentSale += 1;
      }

      return summary;
    },
    {
      products: 0,
      lowStock: 0,
      unitsSold30d: 0,
      noRecentSale: 0,
    },
  );
}
