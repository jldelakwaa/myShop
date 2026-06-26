import "@shopify/shopify-api/adapters/node";
import { ApiVersion, shopifyApi } from "@shopify/shopify-api";

import { getEnv } from "./env.js";

const shopifyClient = shopifyApi({
  apiKey: getEnv("SHOPIFY_API_KEY"),
  apiSecretKey: getEnv("SHOPIFY_API_SECRET"),
  scopes: getEnv("SHOPIFY_SCOPES").split(","),
  hostName: new URL(getEnv("SHOPIFY_APP_URL")).host,
  apiVersion: ApiVersion.July25,
  isEmbeddedApp: true,
});

export const shopify: ReturnType<typeof shopifyApi> = shopifyClient;