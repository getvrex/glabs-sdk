/**
 * Chrome-based reCAPTCHA solver with persistent browser context
 *
 * Uses system's real Chrome browser with a persistent profile for higher
 * reCAPTCHA Enterprise scores. Key advantages over ephemeral Chromium:
 *
 * 1. Real Chrome binary — authentic GPU, WebGL, Canvas fingerprints
 * 2. Persistent profile — cookies/trust accumulate across requests
 * 3. Browser stays alive — faster subsequent tokens, consistent identity
 *
 * Based on community research (flow2api#68): real Chrome + persistent
 * context + ISP proxy achieves ~99% reCAPTCHA pass rate.
 */

import { RECAPTCHA_CONFIG } from "../constants";
import type { GLabsLogger } from "../types/client";
import type { ChromeRecaptchaOptions, RecaptchaTokenResult } from "../types/recaptcha";
import { GLabsError } from "../utils";

export type ChromeRecaptchaServiceOptions = {
  logger?: GLabsLogger;
};

export class ChromeRecaptchaService {
  private readonly logger: GLabsLogger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private context: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pw: any = null;
  private launching: Promise<void> | null = null;

  constructor(options: ChromeRecaptchaServiceOptions = {}) {
    this.logger = options.logger ?? console;
  }

  /**
   * Get a reCAPTCHA token using persistent Chrome browser
   */
  async getToken(
    options: ChromeRecaptchaOptions = {},
    pageAction?: string
  ): Promise<RecaptchaTokenResult> {
    const { maxRetries = 3, timeout = 30000, projectId } = options;
    const effectiveAction = pageAction ?? RECAPTCHA_CONFIG.PAGE_ACTION;
    const websiteKey = RECAPTCHA_CONFIG.WEBSITE_KEY;
    const pageUrl = projectId
      ? `https://labs.google/fx/tools/flow/project/${projectId}`
      : RECAPTCHA_CONFIG.WEBSITE_URL;

    await this.ensureBrowser(options);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let page: any = null;

      try {
        this.logger.log(
          `[reCAPTCHA:Chrome] Attempt ${attempt}/${maxRetries} (Action: ${effectiveAction})`
        );

        page = await this.context.newPage();

        // Hide webdriver property
        await page.addInitScript(
          "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        );

        // Intercept routes — serve minimal HTML with reCAPTCHA script,
        // allow Google infrastructure, block everything else
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.route("**/*", async (route: any) => {
          const url: string = route.request().url();

          if (
            url.replace(/\/$/, "") === pageUrl.replace(/\/$/, "") ||
            url.startsWith(pageUrl)
          ) {
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

        await page.goto(pageUrl, { waitUntil: "load", timeout });

        await page.waitForFunction("typeof grecaptcha !== 'undefined'", {
          timeout: 15000,
        });

        // Execute reCAPTCHA with timeout wrapper
        const token = await page.evaluate(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async ({ key, action }: { key: string; action: string }) => {
            return await new Promise<string>((resolve, reject) => {
              const timer = setTimeout(
                () => reject(new Error("timeout")),
                25000
              );
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
          this.logger.log(
            `[reCAPTCHA:Chrome] Token obtained: ${token.substring(0, 50)}...`
          );
          return { token };
        }

        throw new Error(
          "No token returned from grecaptcha.enterprise.execute()"
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `[reCAPTCHA:Chrome] Attempt ${attempt} failed: ${msg}`
        );

        // If browser context is broken, reset it for next attempt
        if (
          msg.includes("Target closed") ||
          msg.includes("Browser closed") ||
          msg.includes("Connection closed")
        ) {
          this.logger.warn(
            "[reCAPTCHA:Chrome] Browser connection lost, will relaunch..."
          );
          await this.closeBrowser();
          if (attempt < maxRetries) {
            await this.ensureBrowser(options);
          }
        }

        if (attempt === maxRetries) {
          throw new GLabsError(
            `Chrome reCAPTCHA failed after ${maxRetries} attempts: ${msg}`,
            "RECAPTCHA_FAILED"
          );
        }

        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        if (page) {
          await page.close().catch(() => {});
        }
      }
    }

    throw new GLabsError(
      "Chrome reCAPTCHA failed unexpectedly",
      "RECAPTCHA_FAILED"
    );
  }

  /**
   * Ensure the persistent browser is running (deduplicates concurrent launches)
   */
  private async ensureBrowser(options: ChromeRecaptchaOptions): Promise<void> {
    if (this.context) return;

    if (this.launching) {
      await this.launching;
      return;
    }

    this.launching = this.launchBrowser(options);
    try {
      await this.launching;
    } finally {
      this.launching = null;
    }
  }

  /**
   * Launch a persistent Chrome browser context
   */
  private async launchBrowser(options: ChromeRecaptchaOptions): Promise<void> {
    const { headless = false, proxy, userDataDir } = options;

    if (!this.pw) {
      try {
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);
        this.pw = require("playwright");
      } catch {
        throw new GLabsError(
          'playwright is required for the "chrome" reCAPTCHA provider. Install it with: npm install playwright',
          "RECAPTCHA_CONFIG_ERROR"
        );
      }
    }

    // Resolve persistent profile directory
    const { join } = await import("node:path");
    const { homedir } = await import("node:os");
    const { mkdirSync } = await import("node:fs");
    const profileDir =
      userDataDir ?? join(homedir(), ".glabs-sdk", "chrome-profile");
    mkdirSync(profileDir, { recursive: true });

    // Try real Chrome first, fall back to bundled Chromium
    let channel: string | undefined = "chrome";
    try {
      this.logger.log(
        `[reCAPTCHA:Chrome] Launching persistent Chrome (headed=${!headless}, profile=${profileDir})`
      );
      this.context = await this.pw.chromium.launchPersistentContext(
        profileDir,
        {
          channel,
          headless,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-infobars",
          ],
          viewport: { width: 1920, height: 1080 },
          userAgent: getStableUserAgent(),
          ignoreDefaultArgs: ["--enable-automation"],
          ...(proxy ? { proxy } : {}),
        }
      );
    } catch (launchError) {
      const msg =
        launchError instanceof Error ? launchError.message : String(launchError);
      this.logger.warn(
        `[reCAPTCHA:Chrome] System Chrome not available (${msg}), falling back to Chromium...`
      );
      channel = undefined;
      this.context = await this.pw.chromium.launchPersistentContext(
        profileDir + "-chromium",
        {
          headless,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-infobars",
          ],
          viewport: { width: 1920, height: 1080 },
          userAgent: getStableUserAgent(),
          ignoreDefaultArgs: ["--enable-automation"],
          ...(proxy ? { proxy } : {}),
        }
      );
    }

    this.logger.log(
      `[reCAPTCHA:Chrome] Browser launched (channel=${channel ?? "chromium"})`
    );
  }

  /**
   * Close the persistent browser (also called internally on connection errors)
   */
  private async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
  }

  /**
   * Close the persistent browser. Call this when you're done with the service.
   */
  async close(): Promise<void> {
    await this.closeBrowser();
  }
}

/**
 * Stable user agent based on current platform.
 * Persistent profiles should use a consistent UA (not random).
 */
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
