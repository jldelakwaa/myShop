# Arcana Vault Theme

Arcana Vault is an original trading-card storefront focused on Structure Deck discovery, deck-building guidance, and collector-style merchandising.

## Store Concept

The shop presents trading-card starter decks, booster packs, sleeves, collector boxes, and archetype bundles. The visual direction is collector-table drama: dark card surfaces, gold accents, attribute-inspired color, and fast paths into deck discovery.

## Core Pages

- Home: custom hero, Structure Deck carousel, interactive deck oracle, and playset/staple guide.
- Collection: branded product grid with search, dropdown filters, and pagination.
- Product: themed product media, buy plan, guide link, and purchase panel.
- Cart: decklist-style review before checkout.

## Custom Sections

- `arcana-hero.liquid`: cinematic first viewport with generated hero image.
- `archetype-showcase.liquid`: product-driven Structure Deck carousel.
- `deck-oracle.liquid`: interactive playstyle, Attribute, and summon-type picker with an optional card image.
- `playset-guide.liquid`: explains why shoppers may buy three Structure Decks and highlights staple value samples.

## Local Development

Run theme commands from the repository root with the theme path:

```sh
shopify theme dev --path theme --store your-dev-store.myshopify.com
```

Or use the project script if configured:

```sh
pnpm theme:dev
```
