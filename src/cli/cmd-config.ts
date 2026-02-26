/**
 * glabs config show | set
 */

import { parseArgs } from "node:util";
import {
  loadConfig,
  saveConfig,
  maskSecret,
  getConfigPath,
  type CliConfig,
} from "./cli-config.js";
import { fatal, printTable } from "./cli-output.js";

const HELP = `Usage: glabs config <show|set> [options]

Subcommands:
  show    Display current configuration (tokens masked)
  set     Set configuration values

Set options:
  --bearer-token <token>
  --session-token <token>
  --account-tier <pro|ultra>
  --project-id <id>
  --recaptcha-provider <provider>
  --recaptcha-api-key <key>
  --whisk-cookie <cookie>
  --output-dir <path>
`;

export async function run(args: string[]) {
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    console.log(HELP);
    return;
  }

  if (sub === "show") {
    const cfg = loadConfig();
    console.log(`Config: ${getConfigPath()}\n`);
    printTable([
      ["bearer-token", maskSecret(cfg.bearerToken)],
      ["session-token", maskSecret(cfg.sessionToken)],
      ["account-tier", cfg.accountTier ?? "(not set)"],
      ["project-id", cfg.projectId ?? "(not set)"],
      ["recaptcha-provider", cfg.recaptchaProvider ?? "(not set)"],
      ["recaptcha-api-key", maskSecret(cfg.recaptchaApiKey)],
      ["whisk-cookie", maskSecret(cfg.whiskCookie)],
      ["output-dir", cfg.outputDir ?? "(not set)"],
    ]);
    return;
  }

  if (sub === "set") {
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        "bearer-token": { type: "string" },
        "session-token": { type: "string" },
        "account-tier": { type: "string" },
        "project-id": { type: "string" },
        "recaptcha-provider": { type: "string" },
        "recaptcha-api-key": { type: "string" },
        "whisk-cookie": { type: "string" },
        "output-dir": { type: "string" },
      },
      strict: true,
    });

    const patch: Partial<CliConfig> = {};
    let count = 0;

    if (values["bearer-token"] !== undefined) {
      patch.bearerToken = values["bearer-token"];
      count++;
    }
    if (values["session-token"] !== undefined) {
      patch.sessionToken = values["session-token"];
      count++;
    }
    if (values["account-tier"] !== undefined) {
      const v = values["account-tier"];
      if (v !== "pro" && v !== "ultra") fatal("account-tier must be pro|ultra");
      patch.accountTier = v;
      count++;
    }
    if (values["project-id"] !== undefined) {
      patch.projectId = values["project-id"];
      count++;
    }
    if (values["recaptcha-provider"] !== undefined) {
      patch.recaptchaProvider = values["recaptcha-provider"] as CliConfig["recaptchaProvider"];
      count++;
    }
    if (values["recaptcha-api-key"] !== undefined) {
      patch.recaptchaApiKey = values["recaptcha-api-key"];
      count++;
    }
    if (values["whisk-cookie"] !== undefined) {
      patch.whiskCookie = values["whisk-cookie"];
      count++;
    }
    if (values["output-dir"] !== undefined) {
      patch.outputDir = values["output-dir"];
      count++;
    }

    if (count === 0) fatal("No values to set. Use --help for options.");

    saveConfig(patch);
    console.log(`Updated ${count} value(s) in ${getConfigPath()}`);
    return;
  }

  fatal(`Unknown subcommand: ${sub}. Use "glabs config --help".`);
}
