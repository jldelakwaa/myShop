# Arcana Vault Theme

Arcana Vault is an original fantasy trading-card storefront inspired by the excitement of anime duel culture without using official card-game names, logos, characters, or artwork.

## Store Concept

The shop presents trading-card starter decks, booster packs, sleeves, collector boxes, and archetype bundles. The visual direction is collector-table drama: dark card surfaces, gold accents, attribute-inspired color, and fast paths into deck discovery.

## Core Pages

- Home: custom hero, archetype showcase, and interactive deck oracle.
- Collection: product grid for cards and collector gear.
- Product: edition selector, product promises, and collector-focused layout.
- Cart: decklist-style review before checkout.

## Custom Sections

- `arcana-hero.liquid`: cinematic first viewport with generated hero image.
- `archetype-showcase.liquid`: product-driven Structure Deck carousel.
- `deck-oracle.liquid`: interactive playstyle, Attribute, and summon-type picker with an optional card image.

## Local Development

Run theme commands from the repository root with the theme path:

```sh
shopify theme dev --path theme --store 2v0ubf-z1.myshopify.com
```

Or use the project script if configured:

```sh
pnpm theme:dev
```
