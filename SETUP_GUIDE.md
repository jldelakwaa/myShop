# Shopify Take-Home Setup Guide

This guide is for setting up the project yourself from an empty workspace.

Recommended concept:

- Storefront theme: **Arcana Vault**, an original fantasy trading-card store.
- Embedded app: **Signal Shelf**, a Shopify admin app that ranks products and recommends merchandising actions.

The required stack is:

- Shopify theme: Liquid, CSS, minimal JavaScript
- Embedded app frontend: Vite + React
- Embedded app backend: Node.js + Express
- Database: MySQL
- ORM/migrations: Drizzle ORM + Drizzle Kit

## 1. Prerequisites

Install these first:

- Node.js `22.12` or newer
- Git `2.28` or newer
- MySQL `8.x`
- Shopify Partner account
- Shopify development store
- Latest Chrome or Firefox

Install Shopify CLI globally:

```powershell
npm install -g @shopify/cli@latest
shopify version
```

Optional but useful:

```powershell
npm install -g npm-check-updates
```

## 2. Recommended Folder Structure

Create this shape:

```txt
Shopify Store/
  theme/
  app/
    server/
    web/
    drizzle/
    migrations/
  APP_DECISIONS.md
  README.md
  SETUP_GUIDE.md
```

The theme and embedded app should be separate because Shopify themes and Shopify apps have different development flows.

## 3. Shopify Theme Setup

From the project root:

```powershell
shopify theme init
```

When prompted, name the theme:

```txt
theme
```

Then enter the theme folder:

```powershell
cd theme
```

Start the theme preview:

```powershell
shopify theme dev --store your-dev-store.myshopify.com
```

The CLI usually opens or prints:

```txt
http://127.0.0.1:9292
```

Build these required pages:

```txt
templates/index.json
templates/collection.json
templates/product.json
templates/cart.json
```

Suggested custom sections:

```txt
sections/hero-mood.liquid
sections/room-mood-builder.liquid
sections/featured-kits.liquid
sections/ambient-story.liquid
sections/product-compatibility.liquid
```

Suggested snippets:

```txt
snippets/product-card.liquid
snippets/price-pill.liquid
snippets/kit-meter.liquid
```

Suggested assets:

```txt
assets/theme.css
assets/room-mood-builder.js
```

The standout feature should be the **Room Mood Builder**:

1. Ask the shopper about room type, room size, brightness, color temperature, and install comfort.
2. Score the answers in JavaScript.
3. Recommend a kit or bundle.
4. Let the customer add the recommended items to cart.

Before submitting the theme, run:

```powershell
shopify theme check
```

To upload an unpublished copy:

```powershell
shopify theme push --unpublished
```

## 4. Embedded App Setup

Return to the project root:

```powershell
cd ..
```

Create the app folder:

```powershell
mkdir app
cd app
```

Initialize a Shopify app:

```powershell
shopify app init
```

If Shopify CLI offers templates, choose the closest Node/React option. If it offers only Remix-based templates, you can still use Shopify CLI for app registration, config, tunneling, and development store installation, then keep your actual app code as:

```txt
app/server/  Node + Express API
app/web/     Vite + React admin UI
```

The app must include:

- Shopify OAuth install flow
- Embedded app behavior inside Shopify Admin
- Dashboard
- Create/update workflow
- Activity/history tracking
- Product scoring or recommendation logic
- MySQL schema with multiple related tables

## 5. Backend Setup

Inside `app/server`:

```powershell
mkdir server
cd server
npm init -y
npm install express cors dotenv mysql2 drizzle-orm @shopify/shopify-api
npm install -D typescript tsx @types/node @types/express drizzle-kit
npx tsc --init
```

Create these backend files:

```txt
server/
  src/
    index.ts
    env.ts
    shopify.ts
    db/
      index.ts
      schema.ts
    routes/
      auth.ts
      dashboard.ts
      rules.ts
      signals.ts
      activity.ts
    services/
      scoring.ts
      shopify-admin.ts
  drizzle.config.ts
  .env.example
```

Add scripts to `server/package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## 6. MySQL Setup

Create a local database:

```sql
CREATE DATABASE signal_shelf;
CREATE USER 'signal_shelf_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON signal_shelf.* TO 'signal_shelf_user'@'localhost';
FLUSH PRIVILEGES;
```

Use this connection format:

```txt
mysql://signal_shelf_user:strong_password_here@localhost:3306/signal_shelf
```

Create `app/server/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://signal_shelf_user:strong_password_here@localhost:3306/signal_shelf

SHOPIFY_API_KEY=replace_me
SHOPIFY_API_SECRET=replace_me
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_publications
SHOPIFY_APP_URL=https://replace-with-your-tunnel-url
SHOPIFY_REDIRECT_URI=https://replace-with-your-tunnel-url/auth/callback
```

Do not commit `.env`.

## 7. Drizzle Setup

Create `app/server/drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Use related tables like:

```txt
shops
sessions
products
product_metrics
signal_rules
signal_recommendations
recommendation_items
activity_logs
```

Minimum relationship expectations:

```txt
shops -> sessions
shops -> products
products -> product_metrics
shops -> signal_rules
signal_rules -> signal_recommendations
signal_recommendations -> recommendation_items
shops -> activity_logs
```

Generate and apply migrations:

```powershell
npm run db:generate
npm run db:migrate
```

For quick local iteration only, you can use:

```powershell
npm run db:push
```

For the final submission, prefer generated migration files so reviewers can see your schema history.

## 8. Frontend Setup

From `app`:

```powershell
npm create vite@latest web -- --template react-ts
cd web
npm install
npm install @shopify/app-bridge @shopify/app-bridge-react @shopify/polaris
```

Create this frontend shape:

```txt
web/
  src/
    main.tsx
    App.tsx
    api/
      client.ts
    pages/
      Dashboard.tsx
      Rules.tsx
      RuleEditor.tsx
      Recommendations.tsx
      Activity.tsx
    components/
      ProductScoreCard.tsx
      RuleForm.tsx
      ActivityTimeline.tsx
```

Suggested screens:

- Dashboard: top opportunities, risk alerts, score summaries
- Rules: list scoring rules
- Rule editor: create/update thresholds and weighting
- Recommendations: ranked products and suggested actions
- Activity: logs for rule changes, score runs, accepted/dismissed recommendations

## 9. Product Scoring Logic

Implement a score that feels useful to a merchant:

```txt
score =
  inventoryRiskWeight
  + staleInventoryWeight
  + sellThroughWeight
  + marginWeight
  + collectionPriorityWeight
  + manualPriorityWeight
```

Example recommendation types:

```txt
feature_on_homepage
discount
bundle
restock
archive_or_clearance
watch_inventory
```

Every time the score runs, write activity records:

```txt
score_run_started
recommendation_created
recommendation_updated
recommendation_accepted
recommendation_dismissed
rule_created
rule_updated
```

This is what makes the app more than basic CRUD.

## 10. OAuth And Embedded App Flow

At minimum, the backend should support:

```txt
GET /auth?shop=your-store.myshopify.com
GET /auth/callback
GET /api/dashboard
GET /api/rules
POST /api/rules
PUT /api/rules/:id
POST /api/signals/run
GET /api/recommendations
PATCH /api/recommendations/:id
GET /api/activity
```

OAuth checklist:

- Validate the `shop` parameter.
- Redirect the merchant to Shopify authorization.
- Verify callback HMAC.
- Exchange the authorization code for an access token.
- Store shop/session data in MySQL.
- Redirect into the embedded app URL.
- Use authenticated API requests from the embedded frontend.

## 11. Local Development Flow

Use three terminals:

Terminal 1, theme:

```powershell
cd theme
shopify theme dev --store your-dev-store.myshopify.com
```

Terminal 2, backend:

```powershell
cd app/server
npm run dev
```

Terminal 3, frontend:

```powershell
cd app/web
npm run dev
```

If using Shopify CLI for app tunneling/config:

```powershell
cd app
shopify app dev
```

Update `SHOPIFY_APP_URL` and `SHOPIFY_REDIRECT_URI` when the tunnel URL changes.

## 12. Submission Checklist

Theme:

- Home page exists
- Collection page exists
- Product page exists
- Cart page exists
- At least 3 custom sections/components exist
- Room Mood Builder or another standout interactive feature works
- Branding feels original and consistent
- Liquid/CSS/JS are clean and minimal

Embedded app:

- Vite frontend exists
- Node backend exists
- Shopify OAuth is implemented
- App is embedded in Shopify Admin
- MySQL is used
- Drizzle schema exists
- Migrations exist
- Multiple related tables exist
- Dashboard exists
- Create/update workflow exists
- Activity/history tracking exists
- Product scoring/recommendation logic exists

Docs:

- `README.md` explains setup and run commands
- `APP_DECISIONS.md` explains concept, architecture, schema, tradeoffs, and future improvements
- `.env.example` files are included
- Real secrets are not committed

## 13. APP_DECISIONS.md Outline

Use this structure:

```md
# APP_DECISIONS

## Store Concept

## Embedded App Concept

## Key User Problems

## Theme Decisions

## App Architecture

## Database Schema Decisions

## Scoring Logic

## Shopify OAuth / Embedded Flow

## Tradeoffs

## What I Would Improve With More Time
```

## 14. Official References

- Shopify CLI requirements and installation: https://shopify.dev/docs/api/shopify-cli
- Shopify theme setup: https://shopify.dev/docs/storefronts/themes/getting-started/create
- Shopify theme dev command: https://shopify.dev/docs/api/shopify-cli/theme/theme-dev
- Shopify CLI for apps: https://shopify.dev/docs/apps/build/cli-for-apps
- Drizzle MySQL setup: https://orm.drizzle.team/docs/get-started/mysql-new
- Drizzle Kit migrations: https://orm.drizzle.team/docs/kit-overview
