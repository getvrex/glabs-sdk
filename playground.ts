/**
 * Playground for testing the GLabs SDK
 *
 * Run with .env.local (default):
 *   bun playground.ts
 *
 * Run with Chrome persistent browser reCAPTCHA (recommended):
 *   RECAPTCHA_PROVIDER=chrome bun playground.ts
 *
 * Run with Playwright ephemeral browser reCAPTCHA:
 *   RECAPTCHA_PROVIDER=playwright bun playground.ts
 *
 * Run specific tests:
 *   TEST=chrome bun playground.ts         # Only test chrome reCAPTCHA
 *   TEST=playwright bun playground.ts     # Only test playwright reCAPTCHA
 *   TEST=image bun playground.ts          # Only test image generation
 *   TEST=upload bun playground.ts         # Only test image upload (new endpoint)
 *   TEST=upsample-image bun playground.ts # Only test image upsample
 *   TEST=video bun playground.ts          # Only test I2V + status check
 *   TEST=all bun playground.ts            # Run everything
 */

import { GLabsClient } from "./src";
import type { RecaptchaConfig } from "./src/types";

// Load env from .env and .env.local (latter overrides, but CLI env vars take priority)
const cliEnv = { ...process.env };
for (const envFileName of [".env", ".env.local"]) {
  const envFile = Bun.file(envFileName);
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
}
// Restore CLI env vars (they take priority over .env files)
for (const [key, value] of Object.entries(cliEnv)) {
  if (value !== undefined) {
    process.env[key] = value;
  }
}

const bearerToken = process.env.GLABS_BEARER_TOKEN;
const sessionToken = process.env.GLABS_SESSION_TOKEN;
const projectId = process.env.GLABS_PROJECT_ID;
const recaptchaApiKey = process.env.RECAPTCHA_API_KEY;
const regotchaApiKey = process.env.REGOTCHA_API_KEY;
const customRecaptchaEndpoint = process.env.CUSTOM_RECAPTCHA_ENDPOINT;
const veo3solverJwtToken = process.env.VEO3SOLVER_JWT_TOKEN;
const recaptchaProvider = process.env.RECAPTCHA_PROVIDER;
const testFilter = process.env.TEST?.toLowerCase();

if (!bearerToken) {
  console.error("Missing GLABS_BEARER_TOKEN");
  process.exit(1);
}

// Build YesCaptcha fallback config (used by chrome/playwright providers)
const yescaptchaApiKey = process.env.YESCAPTCHA_API_KEY;
const yescaptchaFallback: RecaptchaConfig | undefined = yescaptchaApiKey
  ? { provider: "yescaptcha", apiKey: yescaptchaApiKey }
  : undefined;

// Configure recaptcha: explicit provider > chrome > veo3solver > playwright > regotcha > custom > capsolver
const getRecaptchaConfig = (): RecaptchaConfig | undefined => {
  // Explicit chrome provider (persistent real Chrome, recommended)
  if (recaptchaProvider === "chrome") {
    return {
      provider: "chrome",
      chromeOptions: {
        headless: false,
        projectId,
        maxRetries: 3,
        timeout: 30000,
      },
      fallback: yescaptchaFallback,
    };
  }
  // Explicit playwright provider (ephemeral Chromium)
  if (recaptchaProvider === "playwright") {
    return {
      provider: "playwright",
      playwrightOptions: {
        headless: false,
        projectId,
        maxRetries: 3,
        timeout: 30000,
      },
      fallback: yescaptchaFallback,
    };
  }
  if (veo3solverJwtToken) {
    return { provider: "veo3solver", jwtToken: veo3solverJwtToken };
  }
  if (regotchaApiKey) {
    return { provider: "regotcha", apiKey: regotchaApiKey };
  }
  if (customRecaptchaEndpoint) {
    return {
      provider: "custom",
      customEndpoint: customRecaptchaEndpoint,
      anchor: process.env.RECAPTCHA_ANCHOR,
      reload: process.env.RECAPTCHA_RELOAD,
    };
  }
  if (recaptchaApiKey) {
    return { provider: "capsolver", apiKey: recaptchaApiKey };
  }
  if (yescaptchaApiKey) {
    return { provider: "yescaptcha", apiKey: yescaptchaApiKey };
  }
  return undefined;
};

const recaptchaConfig = getRecaptchaConfig();

const client = new GLabsClient({
  bearerToken,
  sessionToken,
  projectId,
  accountTier: "ultra",
  recaptcha: recaptchaConfig,
});

const sessionId = GLabsClient.generateSessionId();
const shouldRun = (test: string) => !testFilter || testFilter === "all" || testFilter === test;

console.log("=== GLabs SDK Playground ===");
console.log(`Provider:      ${recaptchaConfig?.provider ?? "none"}`);
console.log(`Fallback:      ${recaptchaConfig?.fallback?.provider ?? "none"}`);
console.log(`Project:       ${projectId ?? "auto"}`);
console.log(`SessionToken:  ${sessionToken ? sessionToken.substring(0, 30) + "..." : "none"}`);
console.log(`Test:          ${testFilter ?? "all (default)"}`);
console.log(`Session:       ${sessionId}\n`);

// ---------------------------------------------------------------------------
// Test: Chrome persistent reCAPTCHA
// ---------------------------------------------------------------------------
if (shouldRun("chrome")) {
  console.log("--- Test: Chrome Persistent reCAPTCHA ---");
  try {
    const { ChromeRecaptchaService } = await import("./src/services/chrome-recaptcha.service");
    const service = new ChromeRecaptchaService({ logger: console });
    const result = await service.getToken(
      { headless: false, projectId, maxRetries: 2, timeout: 30000 },
      "IMAGE_GENERATION"
    );
    console.log("  Token obtained:", result.token.substring(0, 60) + "...");
    console.log("  Length:", result.token.length);
    console.log("  PASS\n");
    await service.close();
  } catch (error) {
    console.log("  FAIL:", (error as Error).message, "\n");
  }
}

// ---------------------------------------------------------------------------
// Test: Playwright reCAPTCHA
// ---------------------------------------------------------------------------
if (shouldRun("playwright")) {
  console.log("--- Test: Playwright reCAPTCHA ---");
  try {
    const { PlaywrightRecaptchaService } = await import("./src/services/playwright-recaptcha.service");
    const service = new PlaywrightRecaptchaService({ logger: console });
    const result = await service.getToken(
      { headless: false, projectId, maxRetries: 2, timeout: 30000 },
      "IMAGE_GENERATION"
    );
    console.log("  Token obtained:", result.token.substring(0, 60) + "...");
    console.log("  Length:", result.token.length);
    console.log("  PASS\n");
  } catch (error) {
    console.log("  FAIL:", (error as Error).message, "\n");
  }
}

// ---------------------------------------------------------------------------
// Test: Token refresh (ST→AT)
// ---------------------------------------------------------------------------
if (shouldRun("refresh") || shouldRun("all") || !testFilter) {
  console.log("--- Test: Token Refresh (ST→AT) ---");
  if (!sessionToken) {
    console.log("  SKIP: No GLABS_SESSION_TOKEN configured\n");
  } else {
    try {
      await client.refreshToken();
      console.log("  PASS\n");
    } catch (error) {
      console.log("  FAIL:", (error as Error).message, "\n");
    }
  }
}

// ---------------------------------------------------------------------------
// Test: Credit status
// ---------------------------------------------------------------------------
if (shouldRun("credits") || shouldRun("all") || !testFilter) {
  console.log("--- Test: Credit Status ---");
  try {
    const credits = await client.images.getCreditStatus();
    console.log("  Credits:", JSON.stringify(credits, null, 2).replace(/\n/g, "\n  "));
    console.log("  PASS\n");
  } catch (error) {
    console.log("  FAIL:", (error as Error).message, "\n");
  }
}

// ---------------------------------------------------------------------------
// Test: Image generation (structuredPrompt format)
// ---------------------------------------------------------------------------
let imageMediaId: string | undefined;
if (shouldRun("image")) {
  console.log("--- Test: Image Generation (structuredPrompt) ---");
  try {
    const result = await client.images.generate({
      prompt: "A serene mountain landscape at sunset",
      sessionId,
      aspectRatio: "16:9",
    });
    console.log("  Generated", result.images.length, "image(s)");
    for (const img of result.images) {
      console.log("  - mediaId:", img.mediaId);
      console.log("    fifeUrl:", img.fifeUrl?.substring(0, 80) + "...");
    }
    imageMediaId = result.images[0]?.mediaId;
    console.log("  PASS\n");
  } catch (error) {
    console.log("  FAIL:", (error as Error).message, "\n");
  }
}

// ---------------------------------------------------------------------------
// Test: Image upload (new /v1/flow/uploadImage endpoint)
// ---------------------------------------------------------------------------
let uploadedMediaId: string | undefined;
if (shouldRun("upload") && projectId) {
  console.log("--- Test: Image Upload (new flow/uploadImage endpoint) ---");
  try {
    // Create a tiny 1x1 red PNG for testing
    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const result = await client.images.upload({
      imageBase64: tinyPng,
      sessionId,
      aspectRatio: "1:1",
      projectId,
      fileName: "test-upload.png",
      mimeType: "image/png",
    });
    console.log("  mediaId:", result.mediaId);
    console.log("  mediaGenerationId:", result.mediaGenerationId);
    console.log("  workflowId:", (result as Record<string, unknown>).workflowId);
    uploadedMediaId = result.mediaId ?? result.mediaGenerationId;
    console.log("  PASS\n");
  } catch (error) {
    console.log("  FAIL:", (error as Error).message, "\n");
  }
}

// ---------------------------------------------------------------------------
// Test: Image upsample (new /v1/flow/upsampleImage endpoint)
// ---------------------------------------------------------------------------
if (shouldRun("upsample-image") && imageMediaId) {
  console.log("--- Test: Image Upsample (new endpoint) ---");
  try {
    const result = await client.images.upsampleImage({
      mediaId: imageMediaId,
      targetResolution: "UPSAMPLE_IMAGE_RESOLUTION_2K",
      projectId,
      sessionId,
    });
    console.log("  encodedImage length:", result.encodedImage.length);
    console.log("  PASS\n");
  } catch (error) {
    console.log("  FAIL:", (error as Error).message, "\n");
  }
}

// ---------------------------------------------------------------------------
// Test: Image-to-Video with new status check format
// ---------------------------------------------------------------------------
if (shouldRun("video") && projectId) {
  const mediaIdForVideo = imageMediaId ?? uploadedMediaId;
  if (!mediaIdForVideo) {
    console.log("--- Test: I2V --- Skipped (no image mediaId)\n");
  } else {
    console.log("--- Test: I2V + New Status Check ---");
    try {
      const videoOp = await client.videos.generateImageToVideo({
        prompt: "Camera slowly pans across the landscape",
        startMediaId: mediaIdForVideo,
        sessionId,
        projectId,
        aspectRatio: "16:9",
      });
      console.log("  operationName:", videoOp.operationName);
      console.log("  mediaId:", videoOp.mediaId);
      console.log("  status:", videoOp.status);

      // Test new status check format (media[] based)
      if (videoOp.mediaId) {
        console.log("\n  Checking status with NEW format (mediaId + projectId)...");
        const newStatus = await client.videos.checkStatus({
          mediaId: videoOp.mediaId,
          projectId,
        });
        console.log("  New format status:", newStatus.status);
      }

      // Test legacy status check format (operations[] based)
      console.log("\n  Checking status with LEGACY format (operationName)...");
      const legacyStatus = await client.videos.checkStatus({
        operationName: videoOp.operationName,
        sceneId: videoOp.sceneId,
      });
      console.log("  Legacy format status:", legacyStatus.status);

      console.log("  PASS\n");
    } catch (error) {
      console.log("  FAIL:", (error as Error).message, "\n");
    }
  }
}

// Cleanup persistent browser
await client.close();

console.log("=== Done ===");
