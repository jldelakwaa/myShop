# Shopify OAuth Setup

This file covers the Shopify-specific setup for the embedded app.

## Required Environment Variables

Set these in `app/server/.env`:

```env
SHOPIFY_API_KEY=replace_with_client_id
SHOPIFY_API_SECRET=replace_with_client_secret
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_publications
SHOPIFY_APP_URL=https://replace-with-your-tunnel-url
FRONTEND_APP_URL=http://localhost:5173
```

Shopify calls these values:

```text
Client ID     -> SHOPIFY_API_KEY
Client secret -> SHOPIFY_API_SECRET
```

## Create A Tunnel

The backend runs locally on port `3000`.

```powershell
cloudflared tunnel --url http://localhost:3000
```

Use the printed HTTPS URL as `SHOPIFY_APP_URL`.

## Configure Shopify Dev Dashboard

In `https://dev.shopify.com/dashboard`, open the app and set:

```text
App URL:
https://your-tunnel-url.trycloudflare.com

Allowed redirection URL:
https://your-tunnel-url.trycloudflare.com/auth/callback
```

The app URL, redirect URL, and `SHOPIFY_APP_URL` must use the same host.

## Install The App

Start the app:

```powershell
pnpm run dev
```

Visit:

```text
https://your-tunnel-url.trycloudflare.com/auth?shop=your-dev-store.myshopify.com
```

Expected flow:

1. Backend starts Shopify OAuth.
2. Shopify asks the merchant to approve scopes.
3. Shopify redirects to `/auth/callback`.
4. Backend stores shop/session data in MySQL.
5. Backend redirects into the app URL with `?shop=...`.

## Common Issues

Missing `shop` parameter:

```text
/auth?shop=your-store.myshopify.com
```

Tunnel changed:

- Update `SHOPIFY_APP_URL`.
- Update Shopify App URL.
- Update Shopify allowed redirection URL.
- Restart backend.

New scopes are not active:

- Update `SHOPIFY_SCOPES`.
- Restart backend.
- Reinstall the app so Shopify issues a token with the new scopes.

Trial store media upload errors:

- Trial stores may reject remote media imports.
- The theme includes fallback images, so the storefront still demos correctly.
