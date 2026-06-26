const requiredEnvVars = [
  "DATABASE_URL",
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_SCOPES",
  "SHOPIFY_APP_URL",
  "FRONTEND_APP_URL",
] as const;

export function getEnv(name: (typeof requiredEnvVars)[number]) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function validateEnv() {
  for (const name of requiredEnvVars) {
    getEnv(name);
  }
}