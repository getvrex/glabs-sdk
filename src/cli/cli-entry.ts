/**
 * glabs CLI — command-line interface for the GLabs SDK.
 * Shebang is injected by tsup banner config.
 *
 * Usage: glabs <command> [subcommand] [options]
 */

// Load .env file (CWD) before any command runs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    // Don't override existing env vars
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
} catch {
  // No .env file — that's fine
}

const VERSION = "1.4.0";

const HELP = `glabs — Google Labs AI CLI

Usage: glabs <command> [subcommand] [options]

Commands:
  auth      extract             Extract tokens via Browserless
  config    show | set          Manage CLI configuration
  projects  list | get          Manage projects
  images    generate | upload | upsample | credits
  videos    generate | i2v | extend | reshoot | upsample | status | poll
  whisk     generate            Whisk image generation
  serve                         Start OpenAI-compatible server

Options:
  --help, -h      Show help
  --version, -v   Show version
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(VERSION);
    return;
  }

  const subArgs = args.slice(1);

  switch (command) {
    case "auth": {
      const mod = await import("./cmd-auth.js");
      await mod.run(subArgs);
      break;
    }
    case "config": {
      const mod = await import("./cmd-config.js");
      await mod.run(subArgs);
      break;
    }
    case "projects": {
      const mod = await import("./cmd-projects.js");
      await mod.run(subArgs);
      break;
    }
    case "images": {
      const mod = await import("./cmd-images.js");
      await mod.run(subArgs);
      break;
    }
    case "videos": {
      const mod = await import("./cmd-videos.js");
      await mod.run(subArgs);
      break;
    }
    case "whisk": {
      const mod = await import("./cmd-whisk.js");
      await mod.run(subArgs);
      break;
    }
    case "serve": {
      const mod = await import("./cmd-serve.js");
      await mod.run(subArgs);
      break;
    }
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
