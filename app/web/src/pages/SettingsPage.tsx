import { useEffect, useState } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";

import {
  fetchSettings,
  updateSettings,
  type AppSettingsDraft,
} from "../api/settings";
import { StatePanel } from "../components/StatePanel";
import { useShopParam } from "../hooks/useShopParam";
import { getStorefrontUrl, localThemePreviewUrl } from "../utils/themeLinks";

type PageState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

const emptyDraft: AppSettingsDraft = {
  SHOPIFY_API_KEY: "",
  SHOPIFY_API_SECRET: "",
  SHOPIFY_APP_URL: "",
};

const shopifyDashboardUrl = "https://dev.shopify.com/dashboard";

export function SettingsPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [draft, setDraft] = useState<AppSettingsDraft>(emptyDraft);
  const [hasSavedSecret, setHasSavedSecret] = useState(false);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const connectedShop = useShopParam();
  const [shopDomain, setShopDomain] = useState(connectedShop ?? "");

  const appUrl = normalizeUrl(draft.SHOPIFY_APP_URL);
  const redirectUrl = appUrl ? `${appUrl}/auth/callback` : "";
  const installUrl =
    appUrl && shopDomain.trim()
      ? `${appUrl}/auth?shop=${encodeURIComponent(shopDomain.trim())}`
      : "";
  const storefrontUrl = getStorefrontUrl(shopDomain);

  useEffect(() => {
    let isActive = true;

    async function loadSettings() {
      try {
        const result = await fetchSettings();

        if (!isActive) {
          return;
        }

        setDraft({
          SHOPIFY_API_KEY: result.settings.SHOPIFY_API_KEY,
          SHOPIFY_API_SECRET: "",
          SHOPIFY_APP_URL: result.settings.SHOPIFY_APP_URL,
        });
        setHasSavedSecret(result.settings.hasShopifyApiSecret);
        setPageState({ status: "ready" });
      } catch (error) {
        if (isActive) {
          setPageState({
            status: "error",
            message:
              error instanceof Error ? error.message : "Settings request failed.",
          });
        }
      }
    }

    void loadSettings();

    return () => {
      isActive = false;
    };
  }, []);

  async function saveSettings() {
    setIsSaving(true);
    setNotice(null);

    try {
      const result = await updateSettings(draft);

      setDraft((current) => ({
        ...current,
        SHOPIFY_API_KEY: result.settings.SHOPIFY_API_KEY,
        SHOPIFY_API_SECRET: "",
        SHOPIFY_APP_URL: result.settings.SHOPIFY_APP_URL,
      }));
      setHasSavedSecret(result.settings.hasShopifyApiSecret);
      setNotice("Settings saved. Restart the server for Shopify auth changes to take effect.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Settings save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateDraft<K extends keyof AppSettingsDraft>(
    key: K,
    value: AppSettingsDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function copyText(label: string, value: string) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice("Copy failed. Select the value and copy it manually.");
    }
  }

  function openUrl(value: string) {
    if (!value) {
      return;
    }

    window.open(value, "_blank", "noopener,noreferrer");
  }

  return (
    <Page
      title="Settings"
      subtitle="Local Shopify app configuration"
    >
      {pageState.status === "loading" ? (
        <StatePanel isLoading title="Loading settings" />
      ) : null}

      {pageState.status === "error" ? (
        <StatePanel
          message={pageState.message}
          title="Settings unavailable"
          tone="critical"
        />
      ) : null}

      {pageState.status === "ready" ? (
        <BlockStack gap="400">
          {notice ? (
            <Banner tone="info" onDismiss={() => setNotice(null)}>
              <p>{notice}</p>
            </Banner>
          ) : null}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  Shopify credentials
                </Text>
                <Text as="p" tone="subdued">
                  Values are written to app/server/.env for local development.
                </Text>
              </BlockStack>

              <TextField
                autoComplete="off"
                connectedRight={
                  <Button
                    accessibilityLabel={
                      isApiKeyVisible
                        ? "Hide Shopify API key"
                        : "Show Shopify API key"
                    }
                    onClick={() => setIsApiKeyVisible((current) => !current)}
                  >
                    {isApiKeyVisible ? "Hide" : "Show"}
                  </Button>
                }
                label="SHOPIFY_API_KEY"
                type={isApiKeyVisible ? "text" : "password"}
                value={draft.SHOPIFY_API_KEY}
                onChange={(value) => updateDraft("SHOPIFY_API_KEY", value)}
              />

              <TextField
                autoComplete="off"
                helpText={
                  hasSavedSecret
                    ? "Leave blank to keep the current saved secret."
                    : "No secret is currently saved."
                }
                label="SHOPIFY_API_SECRET"
                type="password"
                value={draft.SHOPIFY_API_SECRET}
                onChange={(value) => updateDraft("SHOPIFY_API_SECRET", value)}
              />

              <TextField
                autoComplete="off"
                label="SHOPIFY_APP_URL"
                value={draft.SHOPIFY_APP_URL}
                onChange={(value) => updateDraft("SHOPIFY_APP_URL", value)}
              />

              <InlineStack align="end">
                <Button loading={isSaving} onClick={saveSettings} variant="primary">
                  Save settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  Quick links
                </Text>
                <Text as="p" tone="subdued">
                  Open Shopify setup pages and copy local app URLs.
                </Text>
              </BlockStack>

              <TextField
                autoComplete="off"
                label="Store domain"
                value={shopDomain}
                onChange={setShopDomain}
              />

              <TextField
                autoComplete="off"
                connectedRight={
                  <Button onClick={() => copyText("App URL", appUrl)}>
                    Copy
                  </Button>
                }
                label="App URL"
                readOnly
                value={appUrl}
              />

              <TextField
                autoComplete="off"
                connectedRight={
                  <Button onClick={() => copyText("Redirect URL", redirectUrl)}>
                    Copy
                  </Button>
                }
                label="Redirect URL"
                readOnly
                value={redirectUrl}
              />

              <TextField
                autoComplete="off"
                connectedRight={
                  <InlineStack gap="200">
                    <Button disabled={!installUrl} onClick={() => copyText("Install URL", installUrl)}>
                      Copy
                    </Button>
                    <Button disabled={!installUrl} onClick={() => openUrl(installUrl)}>
                      Open
                    </Button>
                  </InlineStack>
                }
                label="Install URL"
                readOnly
                value={installUrl}
              />

              <InlineStack gap="200">
                <Button
                  variant="primary"
                  onClick={() => openUrl(localThemePreviewUrl)}
                >
                  Open theme preview
                </Button>
                <Button
                  disabled={!storefrontUrl}
                  onClick={() => openUrl(storefrontUrl)}
                >
                  Open storefront
                </Button>
                <Button variant="primary" onClick={() => openUrl(shopifyDashboardUrl)}>
                  Open Shopify dashboard
                </Button>
                <Button
                  onClick={() =>
                    copyText("Shopify dashboard URL", shopifyDashboardUrl)
                  }
                >
                  Copy dashboard URL
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      ) : null}
    </Page>
  );
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}
