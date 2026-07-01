# Setup Guide

This project contains two deliverables:

- `theme/`: Shopify Liquid theme for Arcana Vault.
- `app/`: embedded Shopify Admin app named Signal Shelf.

Use `README.md` as the primary setup guide. This file is a shorter checklist.

## 1. Install Dependencies

```powershell
pnpm install
pnpm --dir app/web install
pnpm --dir app/server install
```

## 2. Configure MySQL

Create a local database:

```sql
CREATE DATABASE signal_shelf;
CREATE USER 'signal_shelf_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON signal_shelf.* TO 'signal_shelf_user'@'localhost';
FLUSH PRIVILEGES;
```

Copy the env example:

```powershell
Copy-Item app/server/.env.example app/server/.env
```

Update `app/server/.env` with:

```env
DATABASE_URL=mysql://signal_shelf_user:strong_password_here@localhost:3306/signal_shelf
FRONTEND_APP_URL=http://localhost:5173
SHOPIFY_API_KEY=replace_with_client_id
SHOPIFY_API_SECRET=replace_with_client_secret
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_publications
SHOPIFY_APP_URL=https://replace-with-your-tunnel-url
```

## 3. Run Migrations

```powershell
pnpm --dir app/server db:migrate
```

## 4. Configure Shopify OAuth

Start a tunnel:

```powershell
cloudflared tunnel --url http://localhost:3000
```

In Shopify Dev Dashboard:

```text
App URL: https://your-tunnel-url.trycloudflare.com
Allowed redirection URL: https://your-tunnel-url.trycloudflare.com/auth/callback
```

Set the same base tunnel URL as `SHOPIFY_APP_URL`.

## 5. Start Development

App backend and frontend:

```powershell
pnpm run dev
```

Theme preview:

```powershell
pnpm run theme:dev
```

Install the app:

```text
https://your-tunnel-url.trycloudflare.com/auth?shop=your-dev-store.myshopify.com
```

## 6. Demo Checklist

1. Install the app through OAuth.
2. Open the app with `?shop=your-dev-store.myshopify.com`.
3. Products page: click **Create Structure Decks**.
4. Products page: click **Sync products** and **Sync sales**.
5. Rules page: create or update a scoring rule.
6. Recommendations page: click **Generate signals**.
7. Activity page: confirm history was written.
8. Theme preview: check Home, Collection, Product, and Cart.

## 7. Validation

```powershell
pnpm run theme:check
pnpm --dir app/server exec tsc --noEmit
pnpm run web:build
```
