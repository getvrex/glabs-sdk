/**
 * CLI Client Factory — builds GLabsClient / WhiskService from CLI config.
 */

import type { CliConfig } from "./cli-config.js";
import { fatal } from "./cli-output.js";

/** Build a GLabsClient from CLI config */
export async function createClient(cfg: CliConfig) {
  if (!cfg.bearerToken) {
    fatal(
      "Bearer token required. Set via: glabs config set --bearer-token <token>"
    );
  }

  const { GLabsClient } = await import("../client.js");

  return new GLabsClient({
    bearerToken: cfg.bearerToken,
    sessionToken: cfg.sessionToken,
    accountTier: cfg.accountTier ?? "pro",
    projectId: cfg.projectId,
    recaptcha:
      cfg.recaptchaProvider
        ? {
            provider: cfg.recaptchaProvider,
            apiKey: cfg.recaptchaApiKey,
          }
        : undefined,
    logger: console,
  });
}

/** Build a WhiskService from CLI config */
export async function createWhiskService(cfg: CliConfig) {
  if (!cfg.whiskCookie) {
    fatal(
      "Whisk cookie required. Set via: glabs config set --whisk-cookie <cookie>"
    );
  }

  const { WhiskService } = await import("../services/whisk.service.js");
  return new WhiskService(cfg.whiskCookie);
}
