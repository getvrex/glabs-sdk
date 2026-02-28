/**
 * Token Extractor Service
 *
 * Automates bearer + session token extraction via Playwright.
 * Supports local Chromium or remote Browserless.io CDP.
 * Navigates to Google Flow, performs Google login, intercepts API
 * requests for bearer tokens and captures session cookies.
 */

import type {
  GLabsLogger,
  TokenExtractorConfig,
  TokenExtractionResult,
} from "../types/client";

const FLOW_URL = "https://labs.google/fx/tools/flow";
const API_PATTERN = /aisandbox-pa\.googleapis\.com/;
const CREDITS_PATTERN = /aisandbox-pa\.googleapis\.com\/v1\/credits/;
const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const MAX_RETRIES = 3;

type CapturedData = {
  token: string | null;
  sessionToken: string | null;
  sessionExpiresAt: Date | null;
  credits: number | null;
  tier: string | null;
};

export class TokenExtractorService {
  /**
   * Extract tokens with retry logic (up to 3 attempts).
   */
  static async extract(
    config: TokenExtractorConfig,
    logger?: GLabsLogger,
  ): Promise<TokenExtractionResult> {
    const log = logger ?? console;
    let lastError = "Unknown error";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const masked = config.googleEmail.replace(/^[^@]+/, "***");
      log.log(
        `[TokenExtractor] Attempt ${attempt}/${MAX_RETRIES} for ${masked}`,
      );
      const result = await this.extractOnce(config, log);

      if (result.success) return result;

      lastError = result.error ?? "Unknown error";
      log.warn(`[TokenExtractor] Attempt ${attempt} failed: ${lastError}`);

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return {
      success: false,
      error: `Failed after ${MAX_RETRIES} attempts: ${lastError}`,
    };
  }

  /**
   * Single extraction attempt — local Chrome/Chromium or remote Browserless.
   */
  private static async extractOnce(
    config: TokenExtractorConfig,
    logger: GLabsLogger,
  ): Promise<TokenExtractionResult> {
    const { chromium } = await import("playwright");
    let browser: import("playwright").Browser | null = null;
    let localContext: import("playwright").BrowserContext | null = null;

    try {
      let page: import("playwright").Page;

      if (config.browserlessToken) {
        // Remote: connect to Browserless via CDP
        const wsUrl = `wss://chrome.browserless.io?token=${config.browserlessToken}`;
        logger.log("[TokenExtractor] Connecting to Browserless...");
        browser = await chromium.connectOverCDP(wsUrl, { timeout: 15000 });
        const contexts = browser.contexts();
        const context = contexts[0] || (await browser.newContext());
        page = context.pages()[0] || (await context.newPage());
      } else {
        // Local: use persistent context with anti-detection flags
        // (same approach as chrome-recaptcha.service — Google blocks raw Playwright)
        const { join } = await import("node:path");
        const { homedir } = await import("node:os");
        const { mkdirSync } = await import("node:fs");
        const profileDir = join(
          homedir(),
          ".glabs-sdk",
          "token-extractor-profile",
        );
        mkdirSync(profileDir, { recursive: true });

        const launchArgs = [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-infobars",
        ];
        const ua = getStableUserAgent();

        // Try system Chrome first, fallback to bundled Chromium
        try {
          logger.log("[TokenExtractor] Launching Chrome...");
          localContext = await chromium.launchPersistentContext(profileDir, {
            channel: "chrome",
            headless: false,
            args: launchArgs,
            viewport: { width: 1920, height: 1080 },
            userAgent: ua,
            ignoreDefaultArgs: ["--enable-automation"],
          });
        } catch {
          logger.warn("[TokenExtractor] Chrome not found, using Chromium...");
          localContext = await chromium.launchPersistentContext(
            profileDir + "-chromium",
            {
              headless: false,
              args: launchArgs,
              viewport: { width: 1920, height: 1080 },
              userAgent: ua,
              ignoreDefaultArgs: ["--enable-automation"],
            },
          );
        }
        page = localContext.pages()[0] || (await localContext.newPage());
      }

      const captured = await this.performExtraction(
        page,
        config.googleEmail,
        config.googlePassword,
        logger,
      );

      // Close browser/context before validation to avoid timeout
      try {
        if (localContext) {
          await localContext.close();
          localContext = null;
        }
        if (browser) {
          await browser.close();
          browser = null;
        }
      } catch {
        // Ignore close errors
      }

      if (!captured.token) {
        return { success: false, error: "no_token_captured" };
      }

      // Validate token via Google tokeninfo
      const validation = await this.validateToken(captured.token);
      if (!validation.valid || !validation.expiresAt) {
        return { success: false, error: "token_validation_failed" };
      }

      logger.log(
        `[TokenExtractor] Token validated, expires ${validation.expiresAt.toISOString()}`,
      );

      return {
        success: true,
        bearerToken: captured.token,
        sessionToken: captured.sessionToken ?? undefined,
        sessionExpiresAt: captured.sessionExpiresAt ?? undefined,
        credits: captured.credits ?? undefined,
        tier: captured.tier ?? undefined,
        expiresAt: validation.expiresAt,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error(`[TokenExtractor] Extraction failed: ${msg}`);
      return { success: false, error: msg };
    } finally {
      if (localContext) await localContext.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }

  /**
   * Core extraction: intercept API requests and perform login.
   */
  private static async performExtraction(
    page: import("playwright").Page,
    email: string,
    password: string,
    logger: GLabsLogger,
  ): Promise<CapturedData> {
    const captured: CapturedData = {
      token: null,
      sessionToken: null,
      sessionExpiresAt: null,
      credits: null,
      tier: null,
    };
    let tokenCaptured = false;
    let creditsCaptured = false;

    let resolveCapture: () => void;
    const captureComplete = new Promise<void>((resolve) => {
      resolveCapture = resolve;
    });

    // Intercept requests for bearer token
    page.on("request", (request) => {
      if (tokenCaptured) return;
      if (API_PATTERN.test(request.url())) {
        const auth = request.headers()["authorization"];
        if (auth?.startsWith("Bearer ")) {
          captured.token = auth.slice(7);
          tokenCaptured = true;
          logger.log("[TokenExtractor] Bearer token captured");
          if (creditsCaptured) resolveCapture();
        }
      }
    });

    // Intercept responses for credits/tier
    page.on("response", async (response) => {
      if (creditsCaptured) return;
      if (CREDITS_PATTERN.test(response.url()) && response.status() === 200) {
        try {
          const data = await response.json();
          if (data.credits !== undefined) {
            captured.credits = data.credits;
            captured.tier = data.userPaygateTier || null;
            creditsCaptured = true;
            logger.log(
              `[TokenExtractor] Credits: ${data.credits} (${captured.tier ?? "unknown"})`,
            );
            if (tokenCaptured) resolveCapture();
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    });

    // Navigate to Flow
    logger.log("[TokenExtractor] Opening Flow...");
    await page.goto(FLOW_URL, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForSelector("button", { timeout: 5000 }).catch(() => {});

    // Click login trigger button — use text-based locator for nested span text
    const buttonTexts = ["Create with Flow", "Sign in", "Get started"];
    let clicked = false;

    for (const text of buttonTexts) {
      try {
        const btn = page.locator(`button`, { hasText: text }).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          logger.log(`[TokenExtractor] Clicking: "${text}"`);
          await btn.click();
          clicked = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!clicked) {
      logger.warn("[TokenExtractor] No login button found, continuing...");
    }

    // Wait for Google login page or token capture
    await Promise.race([
      page.waitForURL((url) => url.toString().includes("accounts.google.com"), {
        timeout: 5000,
      }),
      page.waitForSelector('input[type="email"]', { timeout: 5000 }),
      new Promise((r) => setTimeout(r, 3000)),
    ]).catch(() => {});

    // Perform login if needed
    const needsLogin =
      page.url().includes("accounts.google.com") ||
      (await page.$('input[type="email"]')) !== null;

    if (needsLogin) {
      logger.log("[TokenExtractor] Performing Google login...");
      await this.performGoogleLogin(page, email, password, logger);
    }

    // Wait for token + credits (max 8s)
    logger.log("[TokenExtractor] Waiting for API requests...");
    await Promise.race([
      captureComplete,
      new Promise<void>((r) => setTimeout(r, 8000)),
    ]);

    // Capture session cookie
    try {
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(
        (c) =>
          c.name === "__Secure-next-auth.session-token" ||
          c.name === "next-auth.session-token",
      );
      if (sessionCookie) {
        captured.sessionToken = sessionCookie.value;
        captured.sessionExpiresAt =
          sessionCookie.expires > 0
            ? new Date(sessionCookie.expires * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        logger.log("[TokenExtractor] Session cookie captured");
      }
    } catch {
      // Ignore cookie capture errors
    }

    if (captured.token) return captured;

    // Fallback: scroll to trigger API call
    try {
      await page.evaluate(() => window.scrollBy(0, 100));
      await new Promise((r) => setTimeout(r, 1500));
    } catch {
      // Page might be closed
    }

    return captured;
  }

  /**
   * Fill Google login form (email → password → wait redirect).
   */
  private static async performGoogleLogin(
    page: import("playwright").Page,
    email: string,
    password: string,
    logger: GLabsLogger,
  ): Promise<void> {
    await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    await page.fill('input[type="email"]', email);
    await page.keyboard.press("Enter");

    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    await page.fill('input[type="password"]', password);
    await page.keyboard.press("Enter");

    logger.log("[TokenExtractor] Waiting for login completion...");
    await page.waitForURL(
      (url) =>
        url.toString().includes("labs.google/fx") &&
        !url.toString().includes("accounts.google.com"),
      { timeout: 30000 },
    );
    logger.log("[TokenExtractor] Login successful");
  }

  /**
   * Validate token via Google tokeninfo endpoint.
   */
  private static async validateToken(
    token: string,
  ): Promise<{ valid: boolean; expiresAt?: Date }> {
    try {
      const res = await fetch(`${TOKENINFO_URL}?access_token=${token}`);
      if (!res.ok) return { valid: false };

      const data = (await res.json()) as { expires_in: string };
      const expiresIn = parseInt(data.expires_in, 10);
      if (isNaN(expiresIn) || expiresIn <= 0) return { valid: false };

      return {
        valid: true,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch {
      return { valid: false };
    }
  }
}

/** Stable user agent to avoid Google detecting automation */
function getStableUserAgent(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
  }
  if (platform === "linux") {
    return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
  }
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
}
