# APP_DECISIONS

## Store Concept

The storefront concept is **Arcana Vault**, a fictional trading-card shop focused on Structure Deck discovery, deck-building routes, and collector-style merchandising. The visual direction is modern card-vault drama: dark table surfaces, gold accents, product-forward imagery, and a discovery flow that feels closer to choosing a duel strategy than browsing generic products.

The theme intentionally uses Yu-Gi-Oh-inspired Structure Deck merchandising as the product domain, while the store brand, interaction patterns, and presentation are original.

## Embedded App Concept

The embedded app is **Signal Shelf**, a Shopify Admin app for merchants who need help deciding what to do with products after they are synced into Shopify.

The core merchant problem:

- Which products should be restocked?
- Which products are stale and need a discount?
- Which products are selling enough to feature?
- Which products should be watched before taking action?

Signal Shelf turns product and metric data into ranked recommendations with an explainable score and a history trail.

## Key User Problems

Merchants often have product data, inventory counts, and sales history, but they still need to translate those signals into concrete merchandising actions. Signal Shelf focuses on that translation step.

The app is not just CRUD. Rules are editable, but the meaningful workflow is:

1. Sync products from Shopify.
2. Sync recent sales metrics.
3. Configure scoring weights and thresholds.
4. Generate ranked recommendations.
5. Accept, dismiss, or revisit recommendations.
6. Review activity history.

## Theme Decisions

The theme uses Liquid, CSS, and minimal JavaScript.

Core pages:

- Home: hero, Structure Deck carousel, interactive deck finder, and playset/staple value guide.
- Collection: search, dropdown filters, custom pagination, branded grid.
- Product: themed background, gallery, purchase panel.
- Cart: themed cart review and order summary.

Custom sections:

- `arcana-hero.liquid`: first impression and primary navigation into products or deck finder.
- `archetype-showcase.liquid`: product carousel for Structure Deck browsing.
- `deck-oracle.liquid`: interactive playstyle, Attribute, and summon-type finder.
- `playset-guide.liquid`: explains why duelists often buy three Structure Decks and highlights staple/hand-trap value.

The standout feature is the **Interactive Deck Finder**. It lets shoppers choose playstyle, Attribute, and summon type, then changes the recommended deck lane, product image, copy, and product link.

## App Architecture

The app is split into:

- `app/web`: Vite, React, React Router, Polaris.
- `app/server`: Node.js, Express, Shopify API client, Drizzle ORM.
- `app/server/drizzle`: generated SQL migrations and Drizzle metadata.

The backend owns OAuth, Shopify Admin GraphQL calls, database writes, recommendation generation, and activity logging. The frontend stays thin and calls JSON API routes.

Main backend routes:

- `/auth` and `/auth/callback`: Shopify OAuth.
- `/api/dashboard`: summary metrics, recommendations, activity.
- `/api/products`: product sync, sales sync, Structure Deck creation.
- `/api/rules`: create/update scoring rules.
- `/api/recommendations`: generate and update recommendations.
- `/api/activity`: activity history.
- `/api/settings`: local setup helper for frequently changing Shopify credentials.

## Database Schema Decisions

The schema uses multiple related MySQL tables:

- `shops`: installed Shopify stores and offline token metadata.
- `sessions`: OAuth/session records.
- `products`: synced Shopify product records.
- `product_metrics`: scoring inputs such as inventory, sales, age, margin, and conversion.
- `signal_rules`: merchant-editable scoring thresholds and weights.
- `signal_recommendations`: generated recommendations and status.
- `recommendation_items`: product items attached to a recommendation.
- `activity_logs`: merchant and system event history.

This keeps Shopify product identity, scoring inputs, rules, generated output, and history separated. That makes the scoring system easier to extend without rewriting the Shopify sync layer.

## Scoring Logic

The scoring logic lives in `app/server/src/services/scoring.ts`.

Inputs include:

- Inventory risk.
- Stale stock.
- Sell-through.
- Conversion rate.
- Gross margin.
- Merchant-defined weights.

The result is clamped to a 0-100 score and mapped to priorities:

- `critical`
- `high`
- `medium`
- `low`

Recommendation type is chosen from product signals:

- Low inventory becomes `restock`.
- Stale inventory becomes `discount`.
- Recent sales can become `feature_on_homepage`.
- Otherwise the app recommends `watch_inventory`.

## Shopify OAuth / Embedded Flow

The backend implements Shopify OAuth with `@shopify/shopify-api`.

The flow:

1. Merchant visits `/auth?shop=...`.
2. Backend starts OAuth.
3. Shopify redirects to `/auth/callback`.
4. Backend stores shop and session data in MySQL.
5. Backend redirects to the configured app URL with the shop parameter.

The app is configured as embedded, and the frontend preserves the `shop` query parameter across routes so API calls operate on the correct shop.

## Local Development Decisions

The project supports demo data and live Shopify data.

Demo mode is useful when no Shopify store is connected. Live mode uses the `shop` query parameter and stored offline token to sync Shopify products and sales data.

The settings page exists because local tunnels and Shopify app credentials change often during development. It is intentionally local-development oriented and should be hardened or removed before production.

## Tradeoffs

- Product media upload can fail on Shopify trial stores, so the theme includes fallback imagery.
- Sales sync uses recent order line items instead of a full analytics warehouse.
- App Bridge session-token authentication is not fully hardened; the project uses the stored offline token for backend Shopify Admin calls.
- Recommendation generation currently replaces open recommendations before regenerating, which keeps demos clean but loses draft history for open items.
- The Structure Deck seeder is useful for demo completeness but would be replaced by merchant-owned catalog import tools in production.

## What I Would Improve With More Time

- Add App Bridge session-token verification for every embedded frontend API request.
- Add automated tests for scoring, rules payload validation, and recommendation generation.
- Add product metafields for richer deck matching and storefront filters.
- Add bulk recommendation actions and scheduled scoring runs.
- Add webhook handling for product updates, order creation, and uninstall.
- Add a real asset pipeline for generated product artwork instead of relying on trial-store-safe fallbacks.
- Add screenshots or a short demo video to the submission package.
