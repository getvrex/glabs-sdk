/**
 * CLI Configuration — loads ~/.glabs/config.json with env var overrides.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AccountTier } from "../types/common.js";
import type { RecaptchaProvider } from "../types/recaptcha.js";

export type CliConfig = {
  bearerToken?: string;
  sessionToken?: string;
  accountTier?: AccountTier;
  projectId?: string;
  recaptchaProvider?: RecaptchaProvider;
  recaptchaApiKey?: string;
  whiskCookie?: string;
  outputDir?: string;
  googleEmail?: string;
  googlePassword?: string;
  browserlessToken?: string;
};

const CONFIG_DIR = join(homedir(), ".glabs");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const ENV_MAP: Record<string, keyof CliConfig> = {
  GLABS_BEARER_TOKEN: "bearerToken",
  GLABS_SESSION_TOKEN: "sessionToken",
  GLABS_ACCOUNT_TIER: "accountTier",
  GLABS_PROJECT_ID: "projectId",
  GLABS_RECAPTCHA_PROVIDER: "recaptchaProvider",
  GLABS_RECAPTCHA_API_KEY: "recaptchaApiKey",
  GLABS_WHISK_COOKIE: "whiskCookie",
  GLABS_OUTPUT_DIR: "outputDir",
  GLABS_GOOGLE_EMAIL: "googleEmail",
  GLABS_GOOGLE_PASSWORD: "googlePassword",
  GLABS_BROWSERLESS_TOKEN: "browserlessToken",
};

/** Read config file from disk, returns empty object if missing */
function readConfigFile(): CliConfig {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as CliConfig;
  } catch {
    return {};
  }
}

/** Load config: file + env var overrides */
export function loadConfig(): CliConfig {
  const cfg = readConfigFile();
  for (const [envKey, cfgKey] of Object.entries(ENV_MAP)) {
    const val = process.env[envKey];
    if (val !== undefined) {
      (cfg as Record<string, unknown>)[cfgKey] = val;
    }
  }
  return cfg;
}

/** Save partial config values to disk (merges with existing) */
export function saveConfig(partial: Partial<CliConfig>): void {
  const existing = readConfigFile();
  const merged = { ...existing, ...partial };
  // Remove undefined values
  for (const key of Object.keys(merged)) {
    if ((merged as Record<string, unknown>)[key] === undefined) {
      delete (merged as Record<string, unknown>)[key];
    }
  }
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + "\n");
}

/** Mask a sensitive string: show first 8 chars + "..." */
export function maskSecret(value: string | undefined): string {
  if (!value) return "(not set)";
  if (value.length <= 8) return "***";
  return value.slice(0, 8) + "...";
}

/** Get config file path (for display) */
export function getConfigPath(): string {
  return CONFIG_FILE;
}
