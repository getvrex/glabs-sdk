# glabs CLI Development Guide

Patterns and conventions for adding/modifying CLI commands.

## Adding a New Command

### 1. Create command module

Create `src/cli/cmd-{name}.ts` following this pattern:

```typescript
import { parseArgs } from "node:util";
import { loadConfig } from "./cli-config.js";
import { createClient } from "./cli-client.js";
import { fatal, printJson, printTable } from "./cli-output.js";

const HELP = `Usage: glabs {name} <subcommand> [options]
...
`;

export async function run(args: string[]) {
  const sub = args[0];
  if (!sub || sub === "--help" || sub === "-h") {
    console.log(HELP);
    return;
  }

  const cfg = loadConfig();
  const client = await createClient(cfg);

  try {
    switch (sub) {
      case "subcommand":
        await runSubcommand(args.slice(1), client);
        break;
      default:
        fatal(`Unknown subcommand: ${sub}. Use "glabs {name} --help".`);
    }
  } finally {
    await client.close();
  }
}
```

### 2. Register in cli-entry.ts

Add case to the switch in `src/cli/cli-entry.ts`:

```typescript
case "{name}": {
  const mod = await import("./cmd-{name}.js");
  await mod.run(subArgs);
  break;
}
```

Update the HELP string with the new command.

### 3. Update version if needed

Version constant in `src/cli/cli-entry.ts`: `const VERSION = "1.4.0";`

## Key Conventions

### Option Parsing
- Use `node:util/parseArgs` with `strict: true`
- Short aliases: `-p` (prompt), `-a` (aspect-ratio), `-n` (count), `-o` (output-dir), `-f` (file), `-m` (model)
- `--json` flag on output commands for raw JSON
- Required options validated with `fatal()` calls

### Output Helpers (cli-output.ts)
- `fatal(msg)` — print error + exit(1)
- `printJson(obj)` — JSON.stringify to stdout
- `printTable(rows)` — aligned key-value table
- `saveImage(base64, dir, prefix?)` — decode + save PNG
- `downloadFile(url, dir)` — fetch + save file
- `progressLine(msg)` / `clearProgress()` — inline progress

### Client Creation
- `createClient(cfg)` — creates GLabsClient from CliConfig
- `createWhiskService(cfg)` — creates WhiskService from CliConfig
- Always call `client.close()` in finally block

### Session IDs
- `GLabsClient.generateSessionId()` — generate per-request session ID
- Import GLabsClient dynamically: `const { GLabsClient } = await import("../client.js")`

### Config Loading
- `loadConfig()` reads `~/.glabs/config.json` then applies env var overrides
- `saveConfig(partial)` merges partial into existing file
- `maskSecret(val)` for display (first 8 chars + "...")

## Account Tiers

| Feature | Pro | Ultra |
|---------|-----|-------|
| Default Video Mode | fast | quality |
| Video Modes | quality, fast | quality, fast |

Override per-request via `--account-tier` flag on video commands.

## Testing CLI Changes

```bash
# Build
npm run build

# Run directly
node dist/cli.js images generate -p "test" --json

# Or via npx after local install
npx glabs images generate -p "test" --json
```
