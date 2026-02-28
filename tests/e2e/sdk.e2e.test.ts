/**
 * Minimal E2E flow tests
 * Keeps only 3 cases:
 * 1) T2I
 * 2) I2I (use last image as reference)
 * 3) I2V (use last image as first frame)
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { GLabsClient } from "../../src";
import type { RecaptchaProvider } from "../../src/types";

const config = {
  bearerToken: process.env.GLABS_BEARER_TOKEN,
  sessionToken: process.env.GLABS_SESSION_TOKEN,
  recaptchaApiKey: process.env.RECAPTCHA_API_KEY,
  recaptchaProvider: (process.env.RECAPTCHA_PROVIDER || "capsolver") as RecaptchaProvider,
};

const hasCredentials = Boolean(config.bearerToken && config.recaptchaApiKey);

let client: GLabsClient;
let sessionId: string;
let projectId: string | undefined;
let t2iMediaId: string | undefined;
let i2iMediaId: string | undefined;

describe("GLabs Minimal E2E Flow", () => {
  beforeAll(async () => {
    if (!hasCredentials) {
      console.log("\n⚠️  Skipping E2E tests: Missing GLABS_BEARER_TOKEN or RECAPTCHA_API_KEY\n");
      return;
    }

    client = new GLabsClient({
      bearerToken: config.bearerToken!,
      sessionToken: config.sessionToken,
      accountTier: "ultra",
      recaptcha: {
        provider: config.recaptchaProvider,
        apiKey: config.recaptchaApiKey,
      },
      logger: {
        log: () => {},
        warn: console.warn,
        error: console.error,
      },
    });

    sessionId = GLabsClient.generateSessionId();
    projectId = await client.projects.getFirstProjectId();

    console.log(`\n🧪 Minimal flow session: ${sessionId.substring(0, 8)}...`);
    console.log(`   Provider: ${config.recaptchaProvider}`);
    console.log(`   Project: ${projectId?.substring(0, 8)}...\n`);
  });

  afterAll(() => {
    if (hasCredentials) {
      console.log("\n✅ Minimal E2E flow completed\n");
    }
  });

  it.skipIf(!hasCredentials)("1) t2i (nanobanana2, vertical)", async () => {
    const result = await client.images.generate({
      prompt: "A funny walrus in tiny sunglasses doing a dramatic movie pose, vertical portrait",
      sessionId,
      aspectRatio: "9:16",
      projectId,
      model: "nanobanana2",
    });

    expect(result.images.length).toBeGreaterThan(0);
    t2iMediaId = result.images[0]?.mediaId;
    expect(t2iMediaId).toBeDefined();

    console.log(`   T2I media: ${t2iMediaId?.substring(0, 20)}...`);
  }, 180000);

  it.skipIf(!hasCredentials)("2) i2i (use last image as reference)", async () => {
    expect(t2iMediaId).toBeDefined();

    const result = await client.images.generate({
      prompt: "Keep the same funny walrus, add a banana-shaped hat and playful vibe",
      sessionId,
      aspectRatio: "9:16",
      projectId,
      model: "nanobanana2",
      references: [{ mediaId: t2iMediaId! }],
    });

    expect(result.images.length).toBeGreaterThan(0);
    i2iMediaId = result.images[0]?.mediaId;
    expect(i2iMediaId).toBeDefined();

    console.log(`   I2I media: ${i2iMediaId?.substring(0, 20)}...`);
  }, 180000);

  it.skipIf(!hasCredentials)("3) i2v (use last image as first frame, fast vertical)", async () => {
    expect(i2iMediaId).toBeDefined();

    const op = await client.videos.generateImageToVideo({
      prompt: "Animate the funny walrus with a tiny dance and goofy camera wobble, keep it cute",
      startMediaId: i2iMediaId!,
      sessionId,
      aspectRatio: "9:16",
      projectId,
      accountTier: "ultra",
      videoMode: "fast",
    });

    expect(op.operationName).toBeDefined();

    const status = await client.videos.pollOperation({
      operationName: op.operationName,
      sceneId: op.sceneId,
      maxAttempts: 40,
      intervalMs: 10000,
    });

    expect(status.status).toBeDefined();
    expect(status.videoUrl).toBeDefined();
    console.log(`   I2V status: ${status.status}`);
    console.log(`   I2V URL: ${status.videoUrl?.substring(0, 80)}...`);
  }, 420000);
});
