/**
 * glabs videos generate | i2v | extend | reshoot | upsample | status | poll
 */

import { parseArgs } from "node:util";
import { loadConfig } from "./cli-config.js";
import { createClient } from "./cli-client.js";
import {
  fatal,
  printJson,
  printTable,
  downloadFile,
  progressLine,
  clearProgress,
} from "./cli-output.js";
import type {
  AccountTier,
  AspectRatio,
  ReshootMotionType,
  VideoMode,
} from "../types/common.js";
import type { VideoStatusResult } from "../types/video.js";

const HELP = `Usage: glabs videos <subcommand> [options]

Subcommands:
  generate    Text-to-video generation
  i2v         Image-to-video generation
  extend      Extend a video
  reshoot     Camera reshoot on a video
  upsample    Upscale a video
  status      Check operation status
  poll        Poll until done, download video

Common options:
  -p, --prompt <text>          Prompt text
  -a, --aspect-ratio <ratio>   16:9 | 9:16 | 1:1 (default: 16:9)
  --seed <n>                   Random seed
  --account-tier <pro|ultra>   Override account tier for this request
  --json                       Output raw JSON

Generate options:
  --mode <quality|fast>        Video mode (default: quality)

I2V options:
  --start-media-id <id>        Start frame media ID (required)
  --end-media-id <id>          End frame media ID
  --mode <quality|fast>        Video mode (default: quality)

Extend options:
  --media-id <id>              Video media ID (required)
  --mode <quality|fast>        Video mode (default: quality)

Reshoot options:
  --media-id <id>              Video media ID (required)
  --motion-type <type>         Camera motion type (required)

Upsample options:
  --media-id <id>              Video media ID (required)
  --resolution <1080p|4k>      Resolution (default: 4k)

Status options:
  --operation-name <name>      Operation name
  --media-id <id>              Media ID
  --project-id <id>            Project ID

Poll options:
  --operation-name <name>      Operation name
  --media-id <id>              Media ID
  --project-id <id>            Project ID
  -o, --output-dir <path>      Output directory
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
  const sessionId = GLabsClient.generateSessionId();

  try {
    switch (sub) {
      case "generate":
        await runGenerate(args.slice(1), client, sessionId);
        break;
      case "i2v":
        await runI2V(args.slice(1), client, sessionId);
        break;
      case "extend":
        await runExtend(args.slice(1), client, sessionId);
        break;
      case "reshoot":
        await runReshoot(args.slice(1), client, sessionId);
        break;
      case "upsample":
        await runUpsample(args.slice(1), client, sessionId);
        break;
      case "status":
        await runStatus(args.slice(1), client);
        break;
      case "poll":
        await runPoll(args.slice(1), client, cfg);
        break;
      default:
        fatal(`Unknown subcommand: ${sub}. Use "glabs videos --help".`);
    }
  } finally {
    await client.close();
  }
}

function printOperation(result: { operationName: string; mediaId?: string; status: string }) {
  printTable([
    ["operation", result.operationName],
    ["media-id", result.mediaId ?? "(none)"],
    ["status", result.status],
  ]);
}

async function runGenerate(args: string[], client: any, sessionId: string) {
  const { values } = parseArgs({
    args,
    options: {
      prompt: { type: "string", short: "p" },
      "aspect-ratio": { type: "string", short: "a" },
      mode: { type: "string" },
      "account-tier": { type: "string" },
      seed: { type: "string" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.prompt) fatal("--prompt is required");

  const result = await client.videos.generateTextToVideo({
    prompt: values.prompt,
    sessionId,
    aspectRatio: (values["aspect-ratio"] as AspectRatio) ?? "16:9",
    videoMode: values.mode as VideoMode | undefined,
    accountTier: values["account-tier"] as AccountTier | undefined,
    seed: values.seed ? Number(values.seed) : undefined,
  });

  if (values.json) { printJson(result); return; }
  printOperation(result);
}

async function runI2V(args: string[], client: any, sessionId: string) {
  const { values } = parseArgs({
    args,
    options: {
      prompt: { type: "string", short: "p" },
      "start-media-id": { type: "string" },
      "end-media-id": { type: "string" },
      "aspect-ratio": { type: "string", short: "a" },
      mode: { type: "string" },
      "account-tier": { type: "string" },
      seed: { type: "string" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.prompt) fatal("--prompt is required");
  if (!values["start-media-id"]) fatal("--start-media-id is required");

  const result = await client.videos.generateImageToVideo({
    prompt: values.prompt,
    startMediaId: values["start-media-id"],
    endMediaId: values["end-media-id"],
    sessionId,
    aspectRatio: (values["aspect-ratio"] as AspectRatio) ?? "16:9",
    videoMode: values.mode as VideoMode | undefined,
    accountTier: values["account-tier"] as AccountTier | undefined,
    seed: values.seed ? Number(values.seed) : undefined,
  });

  if (values.json) { printJson(result); return; }
  printOperation(result);
}

async function runExtend(args: string[], client: any, sessionId: string) {
  const { values } = parseArgs({
    args,
    options: {
      "media-id": { type: "string" },
      prompt: { type: "string", short: "p" },
      "aspect-ratio": { type: "string", short: "a" },
      mode: { type: "string" },
      "account-tier": { type: "string" },
      seed: { type: "string" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values["media-id"]) fatal("--media-id is required");
  if (!values.prompt) fatal("--prompt is required");

  const result = await client.videos.extend({
    mediaId: values["media-id"],
    prompt: values.prompt,
    sessionId,
    aspectRatio: (values["aspect-ratio"] as AspectRatio) ?? "16:9",
    videoMode: values.mode as VideoMode | undefined,
    accountTier: values["account-tier"] as AccountTier | undefined,
    seed: values.seed ? Number(values.seed) : undefined,
  });

  if (values.json) { printJson(result); return; }
  printOperation(result);
}

async function runReshoot(args: string[], client: any, sessionId: string) {
  const { values } = parseArgs({
    args,
    options: {
      "media-id": { type: "string" },
      "motion-type": { type: "string" },
      "aspect-ratio": { type: "string", short: "a" },
      seed: { type: "string" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values["media-id"]) fatal("--media-id is required");
  if (!values["motion-type"]) fatal("--motion-type is required");

  const result = await client.videos.reshoot({
    mediaId: values["media-id"],
    reshootMotionType: values["motion-type"] as ReshootMotionType,
    sessionId,
    aspectRatio: (values["aspect-ratio"] as AspectRatio) ?? "16:9",
    seed: values.seed ? Number(values.seed) : undefined,
  });

  if (values.json) { printJson(result); return; }
  printOperation(result);
}

async function runUpsample(args: string[], client: any, sessionId: string) {
  const { values } = parseArgs({
    args,
    options: {
      "media-id": { type: "string" },
      resolution: { type: "string" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values["media-id"]) fatal("--media-id is required");

  const resMap: Record<string, string> = {
    "1080p": "VIDEO_RESOLUTION_1080P",
    "4k": "VIDEO_RESOLUTION_4K",
  };

  const result = await client.videos.upsample({
    originalMediaId: values["media-id"],
    sessionId,
    resolution: resMap[values.resolution ?? "4k"] as any,
  });

  if (values.json) { printJson(result); return; }
  printOperation(result);
}

async function runStatus(args: string[], client: any) {
  const { values } = parseArgs({
    args,
    options: {
      "operation-name": { type: "string" },
      "media-id": { type: "string" },
      "project-id": { type: "string" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values["operation-name"] && !values["media-id"]) {
    fatal("--operation-name or --media-id is required");
  }

  const result = await client.videos.checkStatus({
    operationName: values["operation-name"],
    mediaId: values["media-id"],
    projectId: values["project-id"],
  });

  if (values.json) { printJson(result); return; }
  printStatusResult(result);
}

async function runPoll(args: string[], client: any, cfg: any) {
  const { values } = parseArgs({
    args,
    options: {
      "operation-name": { type: "string" },
      "media-id": { type: "string" },
      "project-id": { type: "string" },
      "output-dir": { type: "string", short: "o" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values["operation-name"] && !values["media-id"]) {
    fatal("--operation-name or --media-id is required");
  }

  const onProgress = (status: VideoStatusResult, attempt: number) => {
    progressLine(`[${attempt}] ${status.status}...`);
  };

  const result = await client.videos.pollOperation({
    operationName: values["operation-name"],
    mediaId: values["media-id"],
    projectId: values["project-id"],
    onProgress,
  });

  clearProgress();

  if (values.json) { printJson(result); return; }

  printStatusResult(result);

  if (result.videoUrl) {
    const outDir = values["output-dir"] ?? cfg.outputDir ?? "./output";
    const path = await downloadFile(result.videoUrl, outDir);
    console.log(`\nVideo saved: ${path}`);
  }
}

function printStatusResult(result: VideoStatusResult) {
  const rows: [string, string][] = [
    ["status", result.status],
  ];
  if (result.videoUrl) rows.push(["video-url", result.videoUrl]);
  if (result.duration) rows.push(["duration", `${result.duration}s`]);
  if (result.error) rows.push(["error", result.error]);
  if (result.remainingCredits !== undefined) {
    rows.push(["credits", String(result.remainingCredits)]);
  }
  printTable(rows);
}
