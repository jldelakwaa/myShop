# Shopify OAuth Setup Guide

This guide covers the Shopify-specific setup for the embedded app.

Use this after the backend, frontend, MySQL, and Drizzle setup are already working.

## 1. Required Values

The backend needs these environment variables:

```env
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_publications
SHOPIFY_APP_URL=
```

Shopify may call these:

```txt
Client ID      -> SHOPIFY_API_KEY
Client secret  -> SHOPIFY_API_SECRET
```

## 2. Get Client ID And Client Secret

Go to:

```txt
https://dev.shopify.com/dashboard
```

Then:

```txt
Apps
-> select your app
-> Settings / Configuration
-> Client credentials
```

Copy:

```txt
Client ID      -> SHOPIFY_API_KEY
Client secret  -> SHOPIFY_API_SECRET
```

Add them to:

```txt
app/server/.env
```

Example:

```env
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_publications
```

Do not commit `.env`.

## 3. Start A Public Tunnel

Your local backend runs on:

```txt
http://localhost:3000
```

Shopify needs a public HTTPS URL, so use a tunnel.

Install Cloudflare Tunnel if needed:

```powershell
winget install Cloudflare.cloudflared
```

Start tunnel:

```powershell
cloudflared tunnel --url http://localhost:3000
```

It will print a URL like:

```txt
https://milan-karma-layer-maria.trycloudflare.com
```

Use that as:

```env
SHOPIFY_APP_URL=https://milan-karma-layer-maria.trycloudflare.com
```

Important:

```txt
SHOPIFY_APP_URL should be the base URL only.
Do not include /auth.
Do not include /auth/callback.
Do not include ?shop=...
```

Correct:

```env
SHOPIFY_APP_URL=https://milan-karma-layer-maria.trycloudflare.com
```

Wrong:

```env
SHOPIFY_APP_URL=https://milan-karma-layer-maria.trycloudflare.com/auth
SHOPIFY_APP_URL=https://milan-karma-layer-maria.trycloudflare.com/auth/callback
SHOPIFY_APP_URL=https://milan-karma-layer-maria.trycloudflare.com/auth?shop=...
```

## 4. Configure Shopify App URLs

In Shopify Dev Dashboard, open your app.

Depending on the dashboard version, the settings may be under one of these paths:

```txt
Apps -> your app -> Configuration
Apps -> your app -> Build -> Configuration
Apps -> your app -> Versions -> Create/Edit version
```

Look for:

```txt
App URL
Allowed redirection URLs
Redirect URLs
```

Set:

```txt
App URL:
https://your-tunnel-url.trycloudflare.com
```

Set allowed redirect URL:

```txt
https://your-tunnel-url.trycloudflare.com/auth/callback
```

Example:

```txt
App URL:
https://milan-karma-layer-maria.trycloudflare.com

Allowed redirection URL:
https://milan-karma-layer-maria.trycloudflare.com/auth/callback
```

The app URL host and redirect URL host must match.

## 5. Restart Backend

After changing `.env`, restart the backend:

```powershell
cd "C:\Codes\Projects\Shopify Store\app\server"
pnpm dev
```

## 6. Test OAuth

Use this format:

```txt
https://your-tunnel-url.trycloudflare.com/auth?shop=your-dev-store.myshopify.com
```

Example:

```txt
https://milan-karma-layer-maria.trycloudflare.com/auth?shop=my-store-300000000000000011998.myshopify.com
```

Important:

```txt
The query parameter must be named shop.
```

Correct:

```txt
/auth?shop=my-store.myshopify.com
```

Wrong:

```txt
/auth?my-store.myshopify.com
```

## 7. Expected Flow

When OAuth starts correctly:

```txt
1. Browser opens /auth?shop=...
2. Backend redirects to Shopify install/permission screen.
3. Merchant approves the app.
4. Shopify redirects back to /auth/callback.
5. Backend stores shop/session data in MySQL.
6. Backend returns a temporary JSON success response.
```

Current callback success response:

```json
{
  "ok": true,
  "shop": "your-store.myshopify.com",
  "scope": "read_products,write_products,read_orders",
  "embedded": true
}
```

Later, this JSON response should become a redirect into the embedded frontend app.

## 8. Common Errors

### Missing shop query parameter

Error:

```json
{"ok":false,"error":"Missing shop query parameter."}
```

Cause:

```txt
You used /auth?my-store.myshopify.com
```

Fix:

```txt
/auth?shop=my-store.myshopify.com
```

### redirect_uri and application url must have matching hosts

Cause:

```txt
Your Shopify App URL and redirect URL use different hosts.
```

Fix:

Make sure all three use the same tunnel host:

```txt
SHOPIFY_APP_URL
Shopify App URL
Allowed redirection URL
```

Example:

```txt
SHOPIFY_APP_URL=https://milan-karma-layer-maria.trycloudflare.com
App URL=https://milan-karma-layer-maria.trycloudflare.com
Redirect URL=https://milan-karma-layer-maria.trycloudflare.com/auth/callback
```

### Tunnel changed

Cloudflare quick tunnels can generate a new URL when restarted.

If that happens, update:

```txt
app/server/.env
Shopify App URL
Shopify Allowed redirection URL
```

Then restart the backend.

## 9. Current Backend Files

OAuth config:

```txt
app/server/src/shopify.ts
```

Environment helper:

```txt
app/server/src/env.ts
```

OAuth routes:

```txt
app/server/src/routes/auth.ts
```

Main route mounting:

```txt
app/server/src/index.ts
```

Database tables:

```txt
shops
sessions
```

## 10. Next Improvement

The callback currently returns JSON.

Next production-like improvement:

```txt
Redirect from /auth/callback into the embedded Vite frontend.
```

Later:

```txt
Use App Bridge session tokens for authenticated frontend API requests.
```
