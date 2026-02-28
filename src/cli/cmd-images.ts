/**
 * glabs images generate | upload | upsample | credits
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { loadConfig } from "./cli-config.js";
import { createClient } from "./cli-client.js";
import { fatal, printJson, printTable, saveImage } from "./cli-output.js";
import type { AspectRatio, ImageModel } from "../types/common.js";

const HELP = `Usage: glabs images <subcommand> [options]

Subcommands:
  generate    Generate images from prompt
  upload      Upload an image file
  upsample    Upscale an image
  credits     Check credit status

Generate options:
  -p, --prompt <text>                  Image prompt (required)
  -a, --aspect-ratio <ratio>           16:9 | 9:16 | 1:1 (default: 1:1)
  -n, --count <n>                      Number of images 1-4 (default: 1)
  --seed <n>                           Random seed
  -m, --model <name>                   Image model
  --reference-media-id <id>            Reference media ID (repeatable)
  --reference-media-generation-id <id> Reference mediaGenerationId (repeatable)
  -o, --output-dir <path>              Output directory (default: ./output)
  --json                               Output raw JSON (no file save)

Upload options:
  -f, --file <path>           Image file path (required)
  --json                      Output raw JSON

Upsample options:
  --media-id <id>             Media ID to upsample (required)
  --resolution <res>          2K | 4K (default: 4K)
  -o, --output-dir <path>     Output directory
  --json                      Output raw JSON (no file save)

Credits options:
  --json                      Output raw JSON
`;

export async function run(args: string[]) {
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    console.log(HELP);
    return;
  }

  const cfg = loadConfig();
  const client = await createClient(cfg);
  const { GLabsClient } = await import("../client.js");

  try {
    switch (sub) {
      case "generate":
        await runGenerate(args.slice(1), client, GLabsClient, cfg);
        break;
      case "upload":
        await runUpload(args.slice(1), client, GLabsClient);
        break;
      case "upsample":
        await runUpsample(args.slice(1), client, cfg);
        break;
      case "credits":
        await runCredits(args.slice(1), client);
        break;
      default:
        fatal(`Unknown subcommand: ${sub}. Use "glabs images --help".`);
    }
  } finally {
    await client.close();
  }
}

async function runGenerate(
  args: string[],
  client: any,
  GLabsClient: any,
  cfg: any
) {
  const { values } = parseArgs({
    args,
    options: {
      prompt: { type: "string", short: "p" },
      "aspect-ratio": { type: "string", short: "a" },
      count: { type: "string", short: "n" },
      seed: { type: "string" },
      model: { type: "string", short: "m" },
      "reference-media-id": { type: "string", multiple: true },
      "reference-media-generation-id": { type: "string", multiple: true },
      "output-dir": { type: "string", short: "o" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.prompt) fatal("--prompt is required");

  const references = [
    ...((values["reference-media-id"] as string[] | undefined) ?? []).map(
      (mediaId) => ({ mediaId })
    ),
    ...((values["reference-media-generation-id"] as string[] | undefined) ?? []).map(
      (mediaGenerationId) => ({ mediaGenerationId })
    ),
  ];

  const sessionId = GLabsClient.generateSessionId();
  const result = await client.images.generate({
    prompt: values.prompt,
    sessionId,
    aspectRatio: (values["aspect-ratio"] as AspectRatio) ?? "1:1",
    count: values.count ? Number(values.count) : undefined,
    seed: values.seed ? Number(values.seed) : undefined,
    model: values.model as ImageModel | undefined,
    references: references.length > 0 ? references : undefined,
  });

  if (values.json) {
    printJson(result);
    return;
  }

  const outDir = values["output-dir"] ?? cfg.outputDir ?? "./output";
  const saved: string[] = [];
  for (const img of result.images) {
    if (img.encodedImage) {
      saved.push(saveImage(img.encodedImage, outDir));
    }
  }

  console.log(`Generated ${result.images.length} image(s)`);
  for (const path of saved) console.log(`  saved: ${path}`);
}

async function runUpload(args: string[], client: any, GLabsClient: any) {
  const { values } = parseArgs({
    args,
    options: {
      file: { type: "string", short: "f" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.file) fatal("--file is required");

  const buf = readFileSync(values.file);
  const base64 = buf.toString("base64");
  const sessionId = GLabsClient.generateSessionId();

  const result = await client.images.upload({
    imageBase64: base64,
    sessionId,
  });

  if (values.json) {
    printJson(result);
    return;
  }

  printTable([
    ["media-id", result.mediaId ?? "(none)"],
    ["media-generation-id", result.mediaGenerationId ?? "(none)"],
  ]);
}

async function runUpsample(args: string[], client: any, cfg: any) {
  const { values } = parseArgs({
    args,
    options: {
      "media-id": { type: "string" },
      resolution: { type: "string" },
      "output-dir": { type: "string", short: "o" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values["media-id"]) fatal("--media-id is required");

  const resMap: Record<string, string> = {
    "2K": "UPSAMPLE_IMAGE_RESOLUTION_2K",
    "4K": "UPSAMPLE_IMAGE_RESOLUTION_4K",
  };
  const targetResolution = resMap[values.resolution ?? "4K"] as any;

  const result = await client.images.upsampleImage({
    mediaId: values["media-id"],
    targetResolution,
  });

  if (values.json) {
    printJson(result);
    return;
  }

  const outDir = values["output-dir"] ?? cfg.outputDir ?? "./output";
  const path = saveImage(result.encodedImage, outDir, "upsample");
  console.log(`Upsampled image saved: ${path}`);
}

async function runCredits(args: string[], client: any) {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  const result = await client.images.getCreditStatus();

  if (values.json) {
    printJson(result);
    return;
  }

  printTable([
    ["Credits", String(result.credits)],
    ["Tier", result.userPaygateTier],
    ["Membership", result.g1MembershipState],
  ]);
}
