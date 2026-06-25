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