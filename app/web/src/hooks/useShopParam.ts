export function useShopParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get("shop");
}