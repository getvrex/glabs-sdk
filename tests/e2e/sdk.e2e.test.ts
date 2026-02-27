/**
 * GLabs SDK End-to-End Tests
 *
 * These tests use real API calls to verify SDK functionality.
 * Required environment variables:
 *   - GLABS_BEARER_TOKEN: Bearer token for authentication
 *   - GLABS_SESSION_TOKEN: Session token for project API (optional)
 *   - RECAPTCHA_API_KEY: API key for reCAPTCHA provider
 *   - RECAPTCHA_PROVIDER: Provider name (regotcha, capsolver, yescaptcha)
 *
 * Run manually:
 *   bun test:e2e
 *
 * Run on CI:
 *   GLABS_BEARER_TOKEN=xxx RECAPTCHA_API_KEY=xxx bun test:e2e
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { GLabsClient, GLabsError } from "../../src";
import type { RecaptchaProvider } from "../../src/types";

// Test configuration from environment
const config = {
  bearerToken: process.env.GLABS_BEARER_TOKEN,
  sessionToken: process.env.GLABS_SESSION_TOKEN,
  recaptchaApiKey: process.env.RECAPTCHA_API_KEY,
  recaptchaProvider: (process.env.RECAPTCHA_PROVIDER || "chrome") as RecaptchaProvider,
  // Skip video tests to save credits (set to "true" to run)
  runVideoTests: process.env.RUN_VIDEO_TESTS === "true",
};

// Check if we have required credentials
const hasCredentials = Boolean(config.bearerToken && config.recaptchaApiKey);

// Test context - shared across tests
let client: GLabsClient;
let sessionId: string;
let projectId: string | undefined;
let imageMediaId: string | undefined;
let videoOperationName: string | undefined;
let videoSceneId: string | undefined;

describe("GLabs SDK E2E Tests", () => {
  // Skip all tests if no credentials
  beforeAll(() => {
    if (!hasCredentials) {
      console.log("\n⚠️  Skipping E2E tests: Missing required environment variables");
      console.log("   Required: GLABS_BEARER_TOKEN, RECAPTCHA_API_KEY");
      console.log("   Optional: GLABS_SESSION_TOKEN, RECAPTCHA_PROVIDER, RUN_VIDEO_TESTS\n");
      return;
    }

    // Initialize client
    client = new GLabsClient({
      bearerToken: config.bearerToken!,
      sessionToken: config.sessionToken,
      accountTier: "pro",
      recaptcha: {
        provider: config.recaptchaProvider,
        apiKey: config.recaptchaApiKey,
      },
      // Reduce logging in tests
      logger: {
        log: () => {},
        warn: console.warn,
        error: console.error,
      },
    });

    sessionId = GLabsClient.generateSessionId();
    console.log(`\n🧪 Running E2E tests with session: ${sessionId.substring(0, 8)}...`);
    console.log(`   Provider: ${config.recaptchaProvider}`);
    console.log(`   Video tests: ${config.runVideoTests ? "enabled" : "disabled"}\n`);
  });

  afterAll(() => {
    if (hasCredentials) {
      console.log("\n✅ E2E tests completed\n");
    }
  });

  // =========================================================================
  // Static Methods
  // =========================================================================
  describe("Static Methods", () => {
    it("should generate unique session IDs", () => {
      const id1 = GLabsClient.generateSessionId();
      const id2 = GLabsClient.generateSessionId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Client Configuration
  // =========================================================================
  describe("Client Configuration", () => {
    it.skipIf(!hasCredentials)("should create client with valid config", () => {
      expect(client).toBeDefined();
      expect(client.accountTier).toBe("pro");
    });

    it.skipIf(!hasCredentials)("should expose projectId getter", () => {
      // projectId is optional, so just check the getter works
      const pid = client.projectId;
      expect(pid === undefined || typeof pid === "string").toBe(true);
    });
  });

  // =========================================================================
  // Credit Status API
  // =========================================================================
  describe("Credit Status API", () => {
    it.skipIf(!hasCredentials)("should get credit status", async () => {
      const credits = await client.images.getCreditStatus();

      expect(credits).toBeDefined();
      expect(typeof credits.credits).toBe("number");
      expect(credits.credits).toBeGreaterThanOrEqual(0);
      expect(credits.userPaygateTier).toBeDefined();
      expect(credits.g1MembershipState).toBeDefined();
      expect(typeof credits.isUserAnimateCountryEnabled).toBe("boolean");

      console.log(`   Credits: ${credits.credits}`);
    }, 30000);
  });

  // =========================================================================
  // Project API
  // =========================================================================
  describe("Project API", () => {
    it.skipIf(!hasCredentials)("should list projects", async () => {
      const result = await client.projects.list({ pageSize: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.projects)).toBe(true);

      if (result.projects.length > 0) {
        const project = result.projects[0];
        expect(project.projectId).toBeDefined();
        expect(project.projectInfo).toBeDefined();
        expect(project.creationTime).toBeDefined();
        projectId = project.projectId;
        console.log(`   Found ${result.projects.length} project(s)`);
      }
    }, 30000);

    it.skipIf(!hasCredentials)("should get first project ID", async () => {
      const firstId = await client.projects.getFirstProjectId();

      expect(firstId).toBeDefined();
      expect(typeof firstId).toBe("string");
      expect(firstId.length).toBeGreaterThan(0);

      projectId = firstId;
      console.log(`   First project: ${firstId.substring(0, 8)}...`);
    }, 30000);

    it.skipIf(!hasCredentials)("should get specific project", async () => {
      if (!projectId) {
        console.log("   Skipped: No project ID available");
        return;
      }

      const project = await client.projects.get({ projectId });

      expect(project).toBeDefined();
      expect(project.projectId).toBe(projectId);
      expect(project.projectInfo).toBeDefined();
    }, 30000);

    it.skipIf(!hasCredentials)("should clear project cache", () => {
      // Just verify the method exists and doesn't throw
      expect(() => client.projects.clearCache()).not.toThrow();
    });
  });

  // =========================================================================
  // Image Generation API
  // =========================================================================
  describe("Image Generation API", () => {
    it.skipIf(!hasCredentials)("should generate an image", async () => {
      const result = await client.images.generate({
        prompt: "A serene mountain landscape at sunset with golden light",
        sessionId,
        aspectRatio: "16:9",
        projectId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images.length).toBeGreaterThan(0);
      expect(result.sessionId).toBe(sessionId);

      const image = result.images[0];
      expect(image.mediaId || image.fifeUrl).toBeDefined();

      if (image.mediaId) {
        imageMediaId = image.mediaId;
        console.log(`   Generated image: ${image.mediaId.substring(0, 30)}...`);
      }
      if (image.fifeUrl) {
        console.log(`   Image URL: ${image.fifeUrl.substring(0, 50)}...`);
      }
    }, 120000); // 2 minute timeout for reCAPTCHA + generation

    it.skipIf(!hasCredentials)("should handle generation with seed", async () => {
      const testSeed = 12345;
      const result = await client.images.generate({
        prompt: "A simple test image",
        sessionId,
        aspectRatio: "16:9",
        projectId,
        seed: testSeed,
      });

      expect(result).toBeDefined();
      expect(result.images.length).toBeGreaterThan(0);
      // Note: seed may or may not be returned in response
      console.log(`   Generated with seed ${testSeed}`);
    }, 120000);
  });

  // =========================================================================
  // Video Generation API (Optional - costs credits)
  // =========================================================================
  describe("Video Generation API", () => {
    it.skipIf(!hasCredentials || !config.runVideoTests)(
      "should generate text-to-video",
      async () => {
        const result = await client.videos.generateTextToVideo({
          prompt: "A gentle camera pan across a mountain landscape",
          sessionId,
          aspectRatio: "16:9",
          projectId,
        });

        expect(result).toBeDefined();
        expect(result.operationName).toBeDefined();
        expect(result.sceneId).toBeDefined();
        expect(result.status).toBeDefined();

        videoOperationName = result.operationName;
        videoSceneId = result.sceneId;
        console.log(`   Operation: ${result.operationName.substring(0, 20)}...`);
        console.log(`   Status: ${result.status}`);
      },
      180000
    ); // 3 minute timeout

    it.skipIf(!hasCredentials || !config.runVideoTests)(
      "should check video status",
      async () => {
        if (!videoOperationName) {
          console.log("   Skipped: No video operation available");
          return;
        }

        const status = await client.videos.checkStatus({
          operationName: videoOperationName,
          sceneId: videoSceneId,
        });

        expect(status).toBeDefined();
        expect(status.status).toBeDefined();
        console.log(`   Video status: ${status.status}`);
      },
      30000
    );

    it.skipIf(!hasCredentials || !config.runVideoTests || !imageMediaId)(
      "should generate image-to-video",
      async () => {
        if (!imageMediaId) {
          console.log("   Skipped: No image media ID available");
          return;
        }

        const result = await client.videos.generateImageToVideo({
          prompt: "Camera slowly zooms in on the scene",
          startMediaId: imageMediaId,
          sessionId,
          aspectRatio: "16:9",
          projectId,
        });

        expect(result).toBeDefined();
        expect(result.operationName).toBeDefined();
        console.log(`   I2V Operation: ${result.operationName.substring(0, 20)}...`);
      },
      180000
    );
  });

  // =========================================================================
  // Error Handling
  // =========================================================================
  describe("Error Handling", () => {
    it("should throw GLabsError on invalid token", async () => {
      const badClient = new GLabsClient({
        bearerToken: "invalid-token",
        recaptcha: {
          provider: "regotcha",
          apiKey: "invalid-key",
        },
      });

      try {
        await badClient.images.getCreditStatus();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(GLabsError);
        expect((error as GLabsError).code).toBeDefined();
      }
    }, 30000);

    it("should throw error when recaptcha not configured", async () => {
      const noRecaptchaClient = new GLabsClient({
        bearerToken: config.bearerToken || "test-token",
      });

      try {
        await noRecaptchaClient.images.generate({
          prompt: "test",
          sessionId: "test",
          aspectRatio: "16:9",
          projectId: "test",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(GLabsError);
        expect((error as GLabsError).code).toBe("RECAPTCHA_REQUIRED");
      }
    });
  });
});
