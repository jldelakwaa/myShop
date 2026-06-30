import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router, type Router as ExpressRouter } from "express";

export const settingsRouter: ExpressRouter = Router();

const editableKeys = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
] as const;

type EditableKey = (typeof editableKeys)[number];

type SettingsPayload = Partial<Record<EditableKey, unknown>>;

const envFilePath = path.resolve(process.cwd(), ".env");

settingsRouter.get("/", async (_req, res, next) => {
  try {
    const env = await readEnvFile();

    res.json({
      ok: true,
      settings: {
        SHOPIFY_API_KEY: env.SHOPIFY_API_KEY ?? "",
        SHOPIFY_APP_URL: env.SHOPIFY_APP_URL ?? "",
        hasShopifyApiSecret: Boolean(env.SHOPIFY_API_SECRET),
      },
    });
  } catch (error) {
    next(error);
  }
});

settingsRouter.put("/", async (req, res, next) => {
  try {
    const payload = parseSettingsPayload(req.body);
    const current = await readEnvFile();
    const nextValues: Partial<Record<EditableKey, string>> = {};

    for (const key of editableKeys) {
      const value = payload[key];

      if (value === undefined) {
        continue;
      }

      if (key === "SHOPIFY_API_SECRET" && value.trim() === "") {
        continue;
      }

      nextValues[key] = value.trim();
      process.env[key] = value.trim();
    }

    await writeEnvFile({
      ...current,
      ...nextValues,
    });

    res.json({
      ok: true,
      restartRequired: true,
      settings: {
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ?? "",
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL ?? "",
        hasShopifyApiSecret: Boolean(process.env.SHOPIFY_API_SECRET),
      },
    });
  } catch (error) {
    next(error);
  }
});

async function readEnvFile() {
  const contents = await readFile(envFilePath, "utf8");
  const result: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (!key || rawValue === undefined) {
      continue;
    }

    result[key] = unquoteEnvValue(rawValue.trim());
  }

  return result;
}

async function writeEnvFile(values: Record<string, string>) {
  const contents = await readFile(envFilePath, "utf8");
  const seenKeys = new Set<string>();
  const lines = contents.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/);

    if (!match) {
      return line;
    }

    const [, leading, key, separator] = match;

    if (!key || !editableKeys.includes(key as EditableKey)) {
      return line;
    }

    seenKeys.add(key);
    return `${leading}${key}${separator}${quoteEnvValue(values[key] ?? "")}`;
  });

  for (const key of editableKeys) {
    if (!seenKeys.has(key)) {
      lines.push(`${key}=${quoteEnvValue(values[key] ?? "")}`);
    }
  }

  await writeFile(envFilePath, lines.join("\n"), "utf8");
}

function parseSettingsPayload(input: SettingsPayload) {
  const payload: Partial<Record<EditableKey, string>> = {};

  for (const key of editableKeys) {
    const value = input[key];

    if (value === undefined) {
      continue;
    }

    if (typeof value !== "string") {
      throw new HttpError(400, `${key} must be a string.`);
    }

    payload[key] = value;
  }

  return payload;
}

function quoteEnvValue(value: string) {
  if (/^[^\s"'#]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function unquoteEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
