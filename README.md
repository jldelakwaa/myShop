# Arcana Vault / Signal Shelf

Take-home Shopify project using Shopify Liquid, Vite, Node.js, Drizzle ORM, and MySQL.

## Concept

**Arcana Vault** is a fictional trading-card storefront focused on Structure Decks, deck discovery, and collector-style merchandising.

**Signal Shelf** is the embedded Shopify Admin app. It helps a merchant decide what to restock, discount, feature, or watch by scoring products from inventory, sales, age, and configurable rule weights.

## What Is Included

Theme code:

- Home page with custom hero, Structure Deck carousel, and interactive deck finder.
- Collection page with search, dropdown filters, custom pagination, and branded product grid.
- Product page with themed product background, gallery, and purchase panel.
- Cart page with branded order summary and empty-cart state.
- Custom sections in `theme/sections`: `arcana-hero.liquid`, `archetype-showcase.liquid`, `deck-oracle.liquid`.

Embedded app code:

- Vite + React + Polaris frontend in `app/web`.
- Node + Express backend in `app/server`.
- Shopify OAuth install flow.
- MySQL database with Drizzle schema and migrations.
- Dashboard, products, rules, recommendations, activity, and settings pages.
- Product scoring and recommendation generation.
- Shopify product sync and Structure Deck product creation helper.

## Prerequisites

- Node.js 22+
- pnpm
- MySQL 8+
- Shopify CLI
- Cloudflare Tunnel or another HTTPS tunnel
- Shopify Partner account and development store

Install Shopify CLI if needed:

```powershell
npm install -g @shopify/cli@latest
```

Install dependencies:

```powershell
pnpm install
pnpm --dir app/web install
pnpm --dir app/server install
```

## Environment

Copy the example server environment file:

```powershell
Copy-Item app/server/.env.example app/server/.env
```

Create a MySQL database:

```sql
CREATE DATABASE signal_shelf;
CREATE USER 'signal_shelf_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON signal_shelf.* TO 'signal_shelf_user'@'localhost';
FLUSH PRIVILEGES;
```

Set `app/server/.env`:

```env
PORT=3000
DATABASE_URL=mysql://signal_shelf_user:strong_password_here@localhost:3306/signal_shelf
FRONTEND_APP_URL=http://localhost:5173

SHOPIFY_API_KEY=replace_with_client_id
SHOPIFY_API_SECRET=replace_with_client_secret
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_publications
SHOPIFY_APP_URL=https://replace-with-your-tunnel-url
```

Do not commit `.env`.

## Database

Apply migrations:

```powershell
pnpm --dir app/server db:migrate
```

Useful local alternative while iterating:

```powershell
pnpm --dir app/server db:push
```

## Shopify App Setup

Start a public HTTPS tunnel to the backend:

```powershell
cloudflared tunnel --url http://localhost:3000
```

In the Shopify Dev Dashboard, set:

```text
App URL: https://your-tunnel-url.trycloudflare.com
Allowed redirection URL: https://your-tunnel-url.trycloudflare.com/auth/callback
```

Update `SHOPIFY_APP_URL` in `app/server/.env`, then restart the backend.

Install the app:

```text
https://your-tunnel-url.trycloudflare.com/auth?shop=your-dev-store.myshopify.com
```

## Run Locally

Run backend and frontend together:

```powershell
pnpm run dev
```

Run the theme preview:

```powershell
pnpm run theme:dev
```

The theme usually opens at:

```text
http://127.0.0.1:9292
```

The app frontend runs at:

```text
http://localhost:5173
```

## Demo Flow

1. Start MySQL.
2. Start the backend and frontend with `pnpm run dev`.
3. Start the Shopify theme with `pnpm run theme:dev`.
4. Install the embedded app through `/auth?shop=...`.
5. Open the app with `?shop=your-dev-store.myshopify.com`.
6. In Products, click **Create Structure Decks** to populate Shopify products.
7. Click **Sync products** and **Sync sales**.
8. In Rules, create or update the scoring rule.
9. In Recommendations, click **Generate signals**.
10. Review dashboard metrics, product scoring inputs, and activity history.

Trial stores may reject product media uploads. The theme includes fallback visuals so the storefront still works without uploaded product images.

## Validation

Theme check:

```powershell
pnpm run theme:check
```

Backend type check:

```powershell
pnpm --dir app/server exec tsc --noEmit
```

Frontend production build:

```powershell
pnpm run web:build
```

## Deliverables Map

- Shopify theme code: `theme/`
- Embedded app frontend: `app/web/`
- Embedded app backend: `app/server/`
- Drizzle schema: `app/server/src/db/`
- Migrations: `app/server/drizzle/`
- Setup instructions: `README.md`, `SHOPIFY_SETUP.md`
- Decisions document: `APP_DECISIONS.md`
