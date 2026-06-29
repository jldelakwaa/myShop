# Cloudflare Tunnel Setup Guide

This guide explains how to expose the local Shopify app backend to Shopify during development.

Your backend runs locally at:

```txt
http://localhost:3000
```

Shopify OAuth requires a public HTTPS URL, so we use Cloudflare Tunnel.

## 1. Why The URL Keeps Changing

This command creates a **Quick Tunnel**:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Quick Tunnels generate a random URL like:

```txt
https://milan-karma-layer-maria.trycloudflare.com
```

That URL can change every time you restart the tunnel.

So yes, with Quick Tunnels you must update:

```txt
app/server/.env
Shopify App URL
Shopify Allowed redirection URL
```

every time the URL changes.

## 2. Better Option: Stable Named Tunnel

If you want a URL that does not keep changing, use a **named tunnel** with a stable hostname.

You need:

```txt
Cloudflare account
A domain managed by Cloudflare DNS
```

Example stable hostname:

```txt
shopify-app.yourdomain.com
```

Then your env can stay stable:

```env
SHOPIFY_APP_URL=https://shopify-app.yourdomain.com
```

And your Shopify settings can stay stable:

```txt
App URL:
https://shopify-app.yourdomain.com

Allowed redirection URL:
https://shopify-app.yourdomain.com/auth/callback
```

## 3. Option A: Keep Using Quick Tunnel

Use this if you do not have a Cloudflare-managed domain yet.

Start backend:

```powershell
cd "C:\Codes\Projects\Shopify Store\app\server"
pnpm dev
```

Start tunnel in another terminal:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Copy the generated URL:

```txt
https://random-words.trycloudflare.com
```

Update:

```env
SHOPIFY_APP_URL=https://random-words.trycloudflare.com
```

In Shopify Dev Dashboard, update:

```txt
App URL:
https://random-words.trycloudflare.com

Allowed redirection URL:
https://random-words.trycloudflare.com/auth/callback
```

Restart backend after editing `.env`:

```powershell
pnpm dev
```

OAuth test URL:

```txt
https://random-words.trycloudflare.com/auth?shop=your-store.myshopify.com
```

## 4. Option B: Create A Stable Tunnel In Cloudflare Dashboard

Use this if you have a domain on Cloudflare.

Go to:

```txt
https://one.dash.cloudflare.com
```

Then:

```txt
Networks
-> Tunnels
-> Create a tunnel
```

Choose:

```txt
Cloudflared
```

Name it something like:

```txt
shopify-store-dev
```

Cloudflare will show an install/run command for your OS. Run that command in PowerShell.

Then add a public hostname route:

```txt
Public hostname:
shopify-app.yourdomain.com

Service type:
HTTP

Service URL:
localhost:3000
```

After saving, Cloudflare routes:

```txt
https://shopify-app.yourdomain.com
```

to:

```txt
http://localhost:3000
```

## 5. Option C: Create A Stable Locally Managed Tunnel With CLI

Use this if you prefer CLI setup and have a domain on Cloudflare.

Login:

```powershell
cloudflared tunnel login
```

Create named tunnel:

```powershell
cloudflared tunnel create shopify-store-dev
```

Route DNS:

```powershell
cloudflared tunnel route dns shopify-store-dev shopify-app.yourdomain.com
```

Create config file:

```txt
C:\Users\<your-user>\.cloudflared\config.yml
```

Example:

```yaml
tunnel: shopify-store-dev
credentials-file: C:\Users\<your-user>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: shopify-app.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Run tunnel:

```powershell
cloudflared tunnel run shopify-store-dev
```

Then use:

```env
SHOPIFY_APP_URL=https://shopify-app.yourdomain.com
```

## 6. Shopify App Settings For Stable Tunnel

In Shopify Dev Dashboard, set:

```txt
App URL:
https://shopify-app.yourdomain.com
```

Allowed redirection URL:

```txt
https://shopify-app.yourdomain.com/auth/callback
```

Then restart backend:

```powershell
cd "C:\Codes\Projects\Shopify Store\app\server"
pnpm dev
```

Test:

```txt
https://shopify-app.yourdomain.com/auth?shop=your-store.myshopify.com
```

## 7. Which Option Should You Use?

Use **Quick Tunnel** if:

```txt
You are testing quickly
You do not own a domain
You are okay updating Shopify URLs often
```

Use **Stable Named Tunnel** if:

```txt
You want less setup friction
You have a domain on Cloudflare
You want Shopify OAuth URLs to stop changing
```

For this take-home project, either works.

Recommended:

```txt
Quick Tunnel for now
Stable Named Tunnel if you have a Cloudflare-managed domain
```

## 8. Common Mistakes

### Missing `shop=`

Wrong:

```txt
/auth?your-store.myshopify.com
```

Correct:

```txt
/auth?shop=your-store.myshopify.com
```

### App URL Includes `/auth`

Wrong:

```env
SHOPIFY_APP_URL=https://example.com/auth
```

Correct:

```env
SHOPIFY_APP_URL=https://example.com
```

### Redirect Host Does Not Match App URL Host

Wrong:

```txt
App URL:
https://old-tunnel.trycloudflare.com

Redirect URL:
https://new-tunnel.trycloudflare.com/auth/callback
```

Correct:

```txt
App URL:
https://same-host.example.com

Redirect URL:
https://same-host.example.com/auth/callback
```

## 9. Official References

- Cloudflare Quick Tunnels: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- Cloudflare Tunnel overview: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/
- Create a tunnel in dashboard: https://developers.cloudflare.com/tunnel/setup/
- Locally managed tunnels: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/
- Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
