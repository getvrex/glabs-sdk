/**
 * Playwright-based reCAPTCHA solver
 *
 * Launches headless Chromium, injects reCAPTCHA Enterprise script,
 * and executes grecaptcha.enterprise.execute() to obtain tokens directly.
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

/** Playwright-based reCAPTCHA service for obtaining tokens via headless browser */
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
      headless = true,
      proxy,
      projectId,
      maxRetries = 3,
      timeout = 30000,
    } = options;
    const effectiveAction = pageAction ?? RECAPTCHA_CONFIG.PAGE_ACTION;
    const websiteKey = RECAPTCHA_CONFIG.WEBSITE_KEY;

    // Dynamic import - playwright is an optional peer dependency.
    // Use indirect import to avoid TypeScript module resolution at compile time.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pw: any;
    try {
      const moduleName = "playwright";
      pw = await import(/* webpackIgnore: true */ moduleName);
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

        // Launch browser with stealth flags
        browser = await pw.chromium.launch({
          headless,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-first-run",
            "--no-zygote",
            "--disable-infobars",
            "--hide-scrollbars",
          ],
          ...(proxy ? { proxy } : {}),
        });

        const context = await browser.newContext({
          userAgent: getRandomUserAgent(),
          viewport: getRandomViewport(),
        });

        const page = await context.newPage();

        // Intercept all routes - serve injected HTML for the page URL,
        // allow reCAPTCHA infrastructure, block everything else
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.route("**/*", async (route: any) => {
          const url: string = route.request().url();

          if (url.startsWith(pageUrl) || url === pageUrl) {
            // Serve minimal HTML with reCAPTCHA script
            await route.fulfill({
              status: 200,
              contentType: "text/html",
              body: `<!DOCTYPE html>
<html><head>
<script src="https://www.google.com/recaptcha/enterprise.js?render=${websiteKey}"></script>
</head><body></body></html>`,
            });
          } else if (
            url.includes("google.com/recaptcha") ||
            url.includes("gstatic.com") ||
            url.includes("recaptcha.net")
          ) {
            await route.continue();
          } else {
            await route.abort();
          }
        });

        // Navigate to page
        await page.goto(pageUrl, { waitUntil: "networkidle", timeout });

        // Wait for grecaptcha to be available
        await page.waitForFunction(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          () => typeof (window as any).grecaptcha?.enterprise?.execute === "function",
          { timeout: 25000 }
        );

        // Execute reCAPTCHA
        const token = await page.evaluate(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async ({ key, action }: { key: string; action: string }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await (window as any).grecaptcha.enterprise.execute(key, { action });
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

/** Random user agents pool (Chrome on various platforms) */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
] as const;

function getRandomUserAgent(): string {
  // Non-null assertion safe: USER_AGENTS is a non-empty const array
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

/** Random viewport sizes */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
] as const;

function getRandomViewport(): { width: number; height: number } {
  // Non-null assertion safe: VIEWPORTS is a non-empty const array
  const vp = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)]!;
  return { width: vp.width, height: vp.height };
}
