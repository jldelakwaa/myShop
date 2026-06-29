## if shopify isnt installed yet
npm install -g @shopify/cli@latest

## Server
cd app/server
pnpm init -y
pnpm install express cors dotenv mysql2 drizzle-orm @shopify/shopify-api
pnpm install -D typescript tsx @types/node @types/express @types/cors drizzle-kit
pnpm exec tsc --init

# Web
cd Store\app"
pnpm create vite web --template react-ts
cd web
pnpm install
pnpm add @shopify/app-bridge @shopify/app-bridge-react @shopify/polaris
pnpm add react-router-dom

# Database
CREATE DATABASE signal_shelf;
pnpm db:generate
pnpm db:migrate

# Theme
shopify theme init theme
shopify theme dev --store 2v0ubf-z1.myshopify.com
-> go to online store -> preference to get store password