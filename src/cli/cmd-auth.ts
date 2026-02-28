/**
 * glabs auth extract — extract tokens via Browserless
 */

import { parseArgs } from "node:util";
import { loadConfig, saveConfig, maskSecret } from "./cli-config.js";
import { fatal, printTable } from "./cli-output.js";
import { TokenExtractorService } from "../services/token-extractor.service.js";

const HELP = `Usage: glabs auth <extract> [options]

Subcommands:
  extract   Extract bearer + session tokens via Browserless

Extract options:
  --email <email>             Google email (or env GLABS_GOOGLE_EMAIL)
  --password <password>       Google password (or env GLABS_GOOGLE_PASSWORD)
  --browserless-token <tok>   Browserless.io token (optional, uses local browser if omitted)
  --save                      Save extracted tokens to ~/.glabs/config.json
`;

export async function run(args: string[]) {
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    console.log(HELP);
    return;
  }

  if (sub === "extract") {
    await runExtract(args.slice(1));
    return;
  }

  fatal(`Unknown subcommand: ${sub}. Use "glabs auth --help".`);
}

async function runExtract(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      email: { type: "string" },
      password: { type: "string" },
      "browserless-token": { type: "string" },
      save: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const cfg = loadConfig();
  const email = values.email ?? cfg.googleEmail;
  const password = values.password ?? cfg.googlePassword;
  const browserlessToken =
    values["browserless-token"] ?? cfg.browserlessToken;

  if (!email) fatal("Missing --email or GLABS_GOOGLE_EMAIL");
  if (!password) fatal("Missing --password or GLABS_GOOGLE_PASSWORD");

  const mode = browserlessToken ? "Browserless" : "local browser";
  console.log(`Extracting tokens for ${email} via ${mode}...\n`);

  const result = await TokenExtractorService.extract({
    googleEmail: email,
    googlePassword: password,
    browserlessToken: browserlessToken || undefined,
  });

  if (!result.success) {
    fatal(`Extraction failed: ${result.error}`);
  }

  console.log("\nExtraction successful!\n");
  printTable([
    ["bearer-token", maskSecret(result.bearerToken)],
    ["session-token", maskSecret(result.sessionToken)],
    ["credits", String(result.credits ?? "(unknown)")],
    ["tier", result.tier ?? "(unknown)"],
    ["bearer-expires", result.expiresAt?.toISOString() ?? "(unknown)"],
    [
      "session-expires",
      result.sessionExpiresAt?.toISOString() ?? "(unknown)",
    ],
  ]);

  if (values.save) {
    saveConfig({
      bearerToken: result.bearerToken,
      sessionToken: result.sessionToken,
      googleEmail: email,
      googlePassword: password,
      browserlessToken,
    });
    console.log("\nTokens saved to config.");
    console.warn(
      "Warning: credentials are stored in plaintext at ~/.glabs/config.json"
    );
  }
}
