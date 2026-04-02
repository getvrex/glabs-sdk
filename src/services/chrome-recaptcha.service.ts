/**
 * Chrome-based reCAPTCHA solver with persistent browser context
 *
 * Uses system's real Chrome browser with a persistent profile for higher
 * reCAPTCHA Enterprise scores. Key advantages over ephemeral Chromium:
 *
 * 1. Real Chrome binary — authentic GPU, WebGL, Canvas fingerprints
 * 2. Persistent profile — cookies/trust accumulate across requests
 * 3. Browser stays alive — faster subsequent tokens, consistent identity
 * 4. Dual-host failover — recaptcha.net / google.com fallback
 * 5. Settlement wait — post-token delay for enterprise request stability
 * 6. Fingerprint extraction — real UA/sec-ch-ua from browser for API headers
 *
 * Based on flow2api's browser_captcha.py pattern with improvements:
 * - Dual reCAPTCHA host failover (proxy → recaptcha.net first, else google.com)
 * - Settlement wait (configurable, default 3s)
 * - Browser fingerprint extraction (UA, sec-ch-ua, language)
 * - Consecutive failure recycling (≥2 fails → recycle browser)
 * - Request-failed event monitoring for reCAPTCHA resources
 * - Extended stealth Chrome flags
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
  private consecutiveFailures = 0;
  /** Whether a proxy is active (switches primary reCAPTCHA host) */
  private proxyActive = false;

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
    const { maxRetries = 3, timeout = 30000 } = options;
    const effectiveAction = pageAction ?? RECAPTCHA_CONFIG.PAGE_ACTION;
    const websiteKey = RECAPTCHA_CONFIG.WEBSITE_KEY;
    // Use a lightweight API endpoint as page context (from flow2api) —
    // avoids loading the full app while still providing the correct origin
    const pageUrl = "https://labs.google/fx/api/auth/providers";

    this.proxyActive = !!options.proxy;
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

        // Dual-host failover: use recaptcha.net first when behind proxy (better connectivity),
        // otherwise use google.com first (higher trust). Falls back to the other on script load error.
        const primaryHost = this.proxyActive
          ? "https://www.recaptcha.net"
          : "https://www.google.com";
        const secondaryHost = this.proxyActive
          ? "https://www.google.com"
          : "https://www.recaptcha.net";

        // Monitor failed requests for reCAPTCHA resources
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        page.on("requestfailed", (request: any) => {
          try {
            const failedUrl: string = request.url() ?? "";
            if (
              failedUrl.includes("google.com") ||
              failedUrl.includes("gstatic.com") ||
              failedUrl.includes("recaptcha.net")
            ) {
              const failure = request.failure()?.errorText ?? "unknown";
              this.logger.warn?.(
                `[reCAPTCHA:Chrome] Resource load failed: ${failedUrl.substring(0, 200)} (${failure})`
              );
            }
          } catch {
            // Ignore monitoring errors
          }
        });

        // Intercept routes — serve minimal HTML with dual-host reCAPTCHA script failover,
        // allow Google infrastructure, block everything else
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.route("**/*", async (route: any) => {
          const url: string = route.request().url();

          if (
            url.replace(/\/$/, "") === pageUrl.replace(/\/$/, "") ||
            url.startsWith(pageUrl)
          ) {
            // Serve HTML with dual-host failover script loading (from flow2api)
            await route.fulfill({
              status: 200,
              contentType: "text/html",
              body: `<html><head><script>
(() => {
  const urls = [
    '${primaryHost}/recaptcha/enterprise.js?render=${websiteKey}',
    '${secondaryHost}/recaptcha/enterprise.js?render=${websiteKey}'
  ];
  const loadScript = (index) => {
    if (index >= urls.length) return;
    const script = document.createElement('script');
    script.src = urls[index];
    script.async = true;
    script.onerror = () => loadScript(index + 1);
    document.head.appendChild(script);
  };
  loadScript(0);
})();
</script></head><body></body></html>`,
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
          timeout: 10000,
        });

        // Extract real browser fingerprint before executing reCAPTCHA
        const fingerprint = await this.capturePageFingerprint(page);

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
          // Settlement wait: post-token delay for enterprise request chain stability (from flow2api)
          const settleSeconds = options.settleSeconds ?? 3;
          if (settleSeconds > 0) {
            this.logger.log(
              `[reCAPTCHA:Chrome] Token obtained, settling for ${settleSeconds}s...`
            );
            await new Promise((r) => setTimeout(r, settleSeconds * 1000));
          }

          this.logger.log(
            `[reCAPTCHA:Chrome] Token obtained: ${token.substring(0, 50)}...`
          );

          this.consecutiveFailures = 0;

          return {
            token,
            userAgent: fingerprint?.userAgent,
            secChUa: fingerprint?.secChUa,
          };
        }

        throw new Error(
          "No token returned from grecaptcha.enterprise.execute()"
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn?.(
          `[reCAPTCHA:Chrome] Attempt ${attempt} failed: ${msg}`
        );

        this.consecutiveFailures++;

        // If browser context is broken, reset it for next attempt
        const isBrowserDead =
          msg.includes("Target closed") ||
          msg.includes("Browser closed") ||
          msg.includes("Connection closed") ||
          msg.includes("crash");

        // Recycle on browser death OR consecutive failures ≥ 2 (from flow2api)
        if (isBrowserDead || this.consecutiveFailures >= 2) {
          const reason = isBrowserDead ? "browser_dead" : `consecutive_failures_${this.consecutiveFailures}`;
          this.logger.warn?.(
            `[reCAPTCHA:Chrome] Recycling browser (reason: ${reason})...`
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
   * Extract real browser fingerprint (UA, sec-ch-ua, language) from the page.
   * Returns the fingerprint the browser actually exposes — ensures API headers
   * match the browser identity used during reCAPTCHA solving.
   */
  private async capturePageFingerprint(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page: any
  ): Promise<{ userAgent?: string; secChUa?: string; language?: string } | null> {
    try {
      const fingerprint = await page.evaluate(`
        (() => {
          const ua = navigator.userAgent || "";
          const lang = navigator.language || "";
          const uaData = navigator.userAgentData || null;
          let secChUa = "";

          if (uaData && Array.isArray(uaData.brands) && uaData.brands.length > 0) {
            secChUa = uaData.brands
              .map((item) => '"' + item.brand + '";v="' + item.version + '"')
              .join(", ");
          }

          return { userAgent: ua, secChUa, language: lang };
        })()
      `);

      return fingerprint && typeof fingerprint === "object" ? fingerprint : null;
    } catch {
      return null;
    }
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

    // Extended stealth Chrome flags (from flow2api)
    const stealthArgs = [
      "--disable-blink-features=AutomationControlled",
      "--disable-quic",
      "--disable-features=UseDnsHttpsSvcb",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-zygote",
      "--disable-infobars",
      "--hide-scrollbars",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-translate",
      "--disable-default-apps",
      "--no-default-browser-check",
    ];

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
          args: stealthArgs,
          viewport: { width: 1920, height: 1080 },
          locale: "en-US",
          // Do NOT set userAgent — let Chrome use its own authentic UA to avoid
          // UA/sec-ch-ua mismatch that tanks reCAPTCHA scores (from flow2api)
          ignoreDefaultArgs: ["--enable-automation"],
          ...(proxy ? { proxy } : {}),
        }
      );
    } catch (launchError) {
      const msg =
        launchError instanceof Error ? launchError.message : String(launchError);
      this.logger.warn?.(
        `[reCAPTCHA:Chrome] System Chrome not available (${msg}), falling back to Chromium...`
      );
      channel = undefined;
      this.context = await this.pw.chromium.launchPersistentContext(
        profileDir + "-chromium",
        {
          headless,
          args: stealthArgs,
          viewport: { width: 1920, height: 1080 },
          locale: "en-US",
          ignoreDefaultArgs: ["--enable-automation"],
          ...(proxy ? { proxy } : {}),
        }
      );
    }

    this.consecutiveFailures = 0;
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

