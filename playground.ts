/**
 * Playground for testing the GLabs SDK
 *
 * Run with:
 *   GLABS_BEARER_TOKEN=xxx RECAPTCHA_API_KEY=xxx bun playground.ts
 *
 * Or create a .env.local file with the variables and run:
 *   bun playground.ts
 */

import { GLabsClient } from "./src";

// Load env from .env.local if it exists
const envFile = Bun.file(".env.local");
if (await envFile.exists()) {
  const text = await envFile.text();
  for (const line of text.split("\n")) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();
    if (key && value) {
      process.env[key.trim()] = value;
    }
  }
}

const bearerToken = process.env.GLABS_BEARER_TOKEN;
const projectId = process.env.GLABS_PROJECT_ID;
const recaptchaApiKey = process.env.RECAPTCHA_API_KEY;

if (!bearerToken) {
  console.error("Missing GLABS_BEARER_TOKEN");
  process.exit(1);
}

const client = new GLabsClient({
  bearerToken,
  projectId,
  recaptcha: recaptchaApiKey
    ? {
        provider: "capsolver",
        apiKey: recaptchaApiKey,
      }
    : undefined,
});

console.log("=== GLabs SDK Playground ===\n");

// Test 1: Generate session ID
const sessionId = GLabsClient.generateSessionId();
console.log("1. Generated session ID:", sessionId);

// Test 2: Check credit status
try {
  console.log("\n2. Checking credit status...");
  const credits = await client.images.getCreditStatus();
  console.log("   Credits:", JSON.stringify(credits, null, 2));
} catch (error) {
  console.log("   Error:", (error as Error).message);
}

let imageMediaId;
// Test 3: Generate an image (uncomment to test - uses credits)
try {
  console.log("\n3. Generating image...");
  const result = await client.images.generate({
    prompt: "A serene mountain landscape at sunset",
    sessionId,
    aspectRatio: "16:9",
  });
  console.log("   Generated", result.images.length, "image(s)");
  for (const img of result.images) {
    console.log("   - mediaId:", img.mediaId);
    console.log("     fifeUrl:", img.fifeUrl);
  }
  imageMediaId = result.images[0].mediaId!;
} catch (error) {
  console.log("   Error:", (error as Error).message);
}

// Test 4: Image-to-Video (requires an image mediaId from step 3)
try {
  if (!imageMediaId) {
    console.log("   Skipped: Image media ID not found");
    throw new Error("Image media ID not found");
  }
  console.log("\n4. Generating video from image...");
  if (projectId) {
    const videoOp = await client.videos.generateImageToVideo({
      prompt: "Camera slowly pans across the landscape as clouds drift by",
      startMediaId: imageMediaId,
      sessionId,
      projectId,
      aspectRatio: "16:9",
      accountTier: "pro",
    });
    console.log("   Operation started:", videoOp.operationName);
    console.log("   Scene ID:", videoOp.sceneId);

    // Poll for completion
    console.log("   Polling for status...");
    let status = await client.videos.checkStatus({
      operationName: videoOp.operationName,
      sceneId: videoOp.sceneId,
    });

    const isProcessing = (s: string) =>
      s !== "MEDIA_GENERATION_STATUS_COMPLETED" &&
      s !== "MEDIA_GENERATION_STATUS_SUCCESSFUL" &&
      s !== "MEDIA_GENERATION_STATUS_FAILED";

    while (isProcessing(status.status)) {
      console.log("   Status:", status.status);
      await new Promise((r) => setTimeout(r, 5000));
      status = await client.videos.checkStatus({
        operationName: videoOp.operationName,
        sceneId: videoOp.sceneId,
      });
    }

    console.log("   Final status:", status);
    if (status.videoUrl) {
      console.log("   Video URL:", status.videoUrl);
    }
    if (status.error) {
      console.log("   Error:", status.error);
    }
  } else {
    console.log("   Skipped: GLABS_PROJECT_ID required for video generation");
  }
} catch (error) {
  console.log("   Error:", (error as Error).message);
}

console.log("\n=== Done ===");
