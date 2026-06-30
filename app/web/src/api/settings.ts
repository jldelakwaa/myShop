import { apiClient } from "./client";

export type AppSettings = {
  SHOPIFY_API_KEY: string;
  SHOPIFY_APP_URL: string;
  hasShopifyApiSecret: boolean;
};

export type AppSettingsDraft = {
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_APP_URL: string;
};

export function fetchSettings() {
  return apiClient.get<{
    ok: true;
    settings: AppSettings;
  }>("/api/settings");
}

export function updateSettings(settings: AppSettingsDraft) {
  return apiClient.put<{
    ok: true;
    restartRequired: boolean;
    settings: AppSettings;
  }>("/api/settings", settings);
}
