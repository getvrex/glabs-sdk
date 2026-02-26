/**
 * glabs whisk generate
 */

import { parseArgs } from "node:util";
import { loadConfig } from "./cli-config.js";
import { createWhiskService } from "./cli-client.js";
import { fatal, printJson, saveImage } from "./cli-output.js";

const HELP = `Usage: glabs whisk generate [options]

Options:
  -p, --prompt <text>         Image prompt (required)
  -a, --aspect-ratio <ratio>  SQUARE | PORTRAIT | LANDSCAPE (default: SQUARE)
  --seed <n>                  Random seed
  -o, --output-dir <path>     Output directory (default: ./output)
  --json                      Output raw JSON (no file save)
`;

export async function run(args: string[]) {
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    console.log(HELP);
    return;
  }

  if (sub !== "generate") {
    fatal(`Unknown subcommand: ${sub}. Use "glabs whisk --help".`);
  }

  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      prompt: { type: "string", short: "p" },
      "aspect-ratio": { type: "string", short: "a" },
      seed: { type: "string" },
      "output-dir": { type: "string", short: "o" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.prompt) fatal("--prompt is required");

  const cfg = loadConfig();
  const whisk = await createWhiskService(cfg);

  const aspectMap: Record<string, "SQUARE" | "PORTRAIT" | "LANDSCAPE"> = {
    SQUARE: "SQUARE",
    PORTRAIT: "PORTRAIT",
    LANDSCAPE: "LANDSCAPE",
    "1:1": "SQUARE",
    "9:16": "PORTRAIT",
    "16:9": "LANDSCAPE",
  };

  const result = await whisk.generateImage(values.prompt, {
    aspectRatio: aspectMap[values["aspect-ratio"] ?? "SQUARE"] ?? "SQUARE",
    seed: values.seed ? Number(values.seed) : undefined,
  });

  if (values.json) {
    printJson(result);
    return;
  }

  const outDir = values["output-dir"] ?? cfg.outputDir ?? "./output";
  const path = saveImage(result.base64, outDir, "whisk");
  console.log(`Whisk image saved: ${path}`);
}
