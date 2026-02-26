/**
 * Playwright-based reCAPTCHA solver
 *
 * Launches Chromium (headed by default for higher reCAPTCHA scores),
 * injects reCAPTCHA Enterprise script, and executes
 * grecaptcha.enterprise.execute() to obtain tokens directly.
 *
 * Based on flow2api's browser_captcha.py pattern.
 */

import { RECAPTCHA_CONFIG } from "../constants";
import type { GLabsLogger } from "../types/client";
import type { PlaywrightRecaptchaOptions, RecaptchaTokenResult } from "../types/recaptcha";
import { GLabsError } from "../utils";

/** Options for the PlaywrightRecaptchaService */
export type PlaywrightRecaptchaServiceOptions = {
  /** Logger instance */
  logger?: GLabsLogger;
};

/** Playwright-based reCAPTCHA service for obtaining tokens via browser */
export class PlaywrightRecaptchaService {
  private readonly logger: GLabsLogger;

  constructor(options: PlaywrightRecaptchaServiceOptions = {}) {
    this.logger = options.logger ?? console;
  }

  /**
   * Get a reCAPTCHA token using Playwright browser
   */
  async getToken(options: PlaywrightRecaptchaOptions = {}, pageAction?: string): Promise<RecaptchaTokenResult> {
    const {
      headless = false, // Headed by default - Google gives higher scores to visible browsers
      proxy,
      projectId,
      maxRetries = 3,
      timeout = 30000,
    } = options;
    const effectiveAction = pageAction ?? RECAPTCHA_CONFIG.PAGE_ACTION;
    const websiteKey = RECAPTCHA_CONFIG.WEBSITE_KEY;

    // Dynamic import - playwright is an optional peer dependency.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pw: any;
    try {
      // Use createRequire for reliable dynamic loading across bundlers and runtimes
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      pw = require("playwright");
    } catch {
      throw new GLabsError(
        'playwright is required for the "playwright" reCAPTCHA provider. Install it with: npm install playwright',
        "RECAPTCHA_CONFIG_ERROR"
      );
    }

    // Build the page URL for context
    const pageUrl = projectId
      ? `https://labs.google/fx/tools/flow/project/${projectId}`
      : RECAPTCHA_CONFIG.WEBSITE_URL;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let browser: any = null;

      try {
        this.logger.log(`[reCAPTCHA:Playwright] Attempt ${attempt}/${maxRetries} (Action: ${effectiveAction})`);

        const viewport = getRandomViewport();

        // Launch browser with stealth flags (matches flow2api's browser_captcha.py)
        browser = await pw.chromium.launch({
          headless,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-first-run",
            "--no-zygote",
            `--window-size=${viewport.width},${viewport.height}`,
            "--disable-infobars",
            "--hide-scrollbars",
          ],
          ...(proxy ? { proxy } : {}),
        });

        const context = await browser.newContext({
          userAgent: getRandomUserAgent(),
          viewport,
        });

        const page = await context.newPage();

        // Hide webdriver property (anti-detection)
        await page.addInitScript(
          "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        );

        // Intercept all routes - serve injected HTML for the page URL,
        // allow reCAPTCHA infrastructure (broader domain matching like flow2api),
        // block everything else
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.route("**/*", async (route: any) => {
          const url: string = route.request().url();

          if (url.replace(/\/$/, "") === pageUrl.replace(/\/$/, "") || url.startsWith(pageUrl)) {
            // Serve minimal HTML with reCAPTCHA script
            await route.fulfill({
              status: 200,
              contentType: "text/html",
              body: `<html><head><script src="https://www.google.com/recaptcha/enterprise.js?render=${websiteKey}"></script></head><body></body></html>`,
            });
          } else if (
            url.includes("google.com") ||
            url.includes("gstatic.com") ||
            url.includes("recaptcha.net")
          ) {
            await route.continue();
          } else {
            await route.abort();
          }
        });

        // Navigate to page (use "load" like flow2api, not "networkidle")
        await page.goto(pageUrl, { waitUntil: "load", timeout });

        // Wait for grecaptcha to be available (simpler check like flow2api)
        await page.waitForFunction(
          "typeof grecaptcha !== 'undefined'",
          { timeout: 15000 }
        );

        // Execute reCAPTCHA with timeout wrapper
        const token = await page.evaluate(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async ({ key, action }: { key: string; action: string }) => {
            return await new Promise<string>((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error("timeout")), 25000);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).grecaptcha.enterprise
                .execute(key, { action })
                .then((t: string) => {
                  clearTimeout(timer);
                  resolve(t);
                })
                .catch((e: Error) => {
                  clearTimeout(timer);
                  reject(e);
                });
            });
          },
          { key: websiteKey, action: effectiveAction }
        );

        if (token && typeof token === "string") {
          this.logger.log(`[reCAPTCHA:Playwright] Token obtained: ${token.substring(0, 50)}...`);
          return { token };
        }

        throw new Error("No token returned from grecaptcha.enterprise.execute()");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[reCAPTCHA:Playwright] Attempt ${attempt} failed: ${msg}`);

        if (attempt === maxRetries) {
          throw new GLabsError(
            `Playwright reCAPTCHA failed after ${maxRetries} attempts: ${msg}`,
            "RECAPTCHA_FAILED"
          );
        }

        // Wait before retry
        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        if (browser) {
          await browser.close().catch(() => {});
        }
      }
    }

    // Should not reach here
    throw new GLabsError("Playwright reCAPTCHA failed unexpectedly", "RECAPTCHA_FAILED");
  }
}

/** Random user agents pool (matches flow2api's extensive UA list) */
const USER_AGENTS = [
  // Windows Chrome
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  // Windows Edge
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  // macOS Chrome
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  // macOS Safari
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  // macOS Edge
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  // Linux Chrome
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
] as const;

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

/** Random viewport sizes (matches flow2api's resolution pool) */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1600, height: 900 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
  { width: 1920, height: 1200 },
  { width: 2880, height: 1800 },
  { width: 3024, height: 1890 },
] as const;

function getRandomViewport(): { width: number; height: number } {
  const vp = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)]!;
  // Subtract random amount from height (like flow2api: base_h - random.randint(0, 80))
  const height = vp.height - Math.floor(Math.random() * 80);
  return { width: vp.width, height };
}
