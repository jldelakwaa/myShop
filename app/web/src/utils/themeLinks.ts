export const localThemePreviewUrl = "http://127.0.0.1:9292";

export function getStorefrontUrl(shopDomain: string) {
  const cleanShopDomain = shopDomain.trim();

  if (!cleanShopDomain) {
    return "";
  }

  return `https://${cleanShopDomain}`;
}
