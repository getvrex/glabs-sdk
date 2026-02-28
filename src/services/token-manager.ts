/**
 * Token Manager Service
 *
 * Manages bearer token lifecycle with automatic refresh via session token.
 * Uses the same ST→AT pattern as flow2api: calls the Google Labs session
 * endpoint with the session-token cookie to obtain a fresh access token.
 */

import type {
  GLabsLogger,
  ResolvedConfig,
  TokenExtractionResult,
} from "../types/client";
import { fetchWithRetry } from "../utils/fetch";
import { GLabsError } from "../utils/errors";
import { TokenExtractorService } from "./token-extractor.service";

/** Session endpoint for ST→AT conversion */
const SESSION_ENDPOINT = "https://labs.google/fx/api/auth/session";

/** Proactive refresh threshold: refresh when less than this many ms remain */
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/** Session response from Google Labs auth endpoint */
type SessionResponse = {
  access_token?: string;
  expires?: string;
  error?: string;
  user?: {
    email?: string;
    name?: string;
  };
};

export class TokenManager {
  private readonly config: ResolvedConfig;
  private readonly logger: GLabsLogger;
  private tokenExpiry?: Date;
  private refreshPromise?: Promise<void>;

  constructor(config: ResolvedConfig) {
    this.config = config;
    this.logger = config.logger;
  }

  /**
   * Ensure the bearer token is valid, refreshing proactively if needed.
   * Safe to call frequently - only refreshes when necessary.
   */
  async ensureValid(): Promise<void> {
    if (!this.config.sessionToken && !this.config.tokenExtractor) {
      return; // No session token or extractor = can't refresh, use bearer as-is
    }

    if (!(await this.needsRefresh())) {
      return;
    }

    // Deduplicate concurrent refresh calls
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = undefined;
      });
    }

    await this.refreshPromise;
  }

  /**
   * Force a token refresh (e.g. after a 401 response).
   */
  async forceRefresh(): Promise<void> {
    if (!this.config.sessionToken && !this.config.tokenExtractor) {
      throw new GLabsError(
        "Cannot refresh token: no sessionToken or tokenExtractor configured.",
        "AUTH_ERROR"
      );
    }

    this.tokenExpiry = undefined; // Force refresh

    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = undefined;
      });
    }

    await this.refreshPromise;
  }

  /**
   * Extract fresh tokens via Browserless (manual trigger).
   * Requires tokenExtractor config.
   */
  async extractTokens(): Promise<TokenExtractionResult> {
    if (!this.config.tokenExtractor) {
      return { success: false, error: "No tokenExtractor configured" };
    }

    return TokenExtractorService.extract(
      this.config.tokenExtractor,
      this.logger
    );
  }

  /** Check whether the token needs refreshing */
  private async needsRefresh(): Promise<boolean> {
    // No known expiry — validate current token before triggering a refresh
    if (!this.tokenExpiry) {
      const valid = await this.validateCurrentToken();
      if (valid) return false;
      return true;
    }

    // Proactive refresh: refresh if less than threshold remains
    return Date.now() + REFRESH_THRESHOLD_MS >= this.tokenExpiry.getTime();
  }

  /** Validate the current bearer token via Google tokeninfo */
  private async validateCurrentToken(): Promise<boolean> {
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${this.config.bearerToken}`
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { expires_in: string };
      const expiresIn = parseInt(data.expires_in, 10);
      if (isNaN(expiresIn) || expiresIn <= 0) return false;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
      const mins = Math.round(expiresIn / 60);
      this.logger.log(`[TokenManager] Current token valid (expires in ${mins}m)`);
      return Date.now() + REFRESH_THRESHOLD_MS < this.tokenExpiry.getTime();
    } catch {
      return false;
    }
  }

  /** Perform the actual ST→AT refresh, fallback to extraction if needed */
  private async doRefresh(): Promise<void> {
    // If no session token but extractor is configured, go straight to extraction
    if (!this.config.sessionToken && this.config.tokenExtractor) {
      await this.doExtractFallback();
      return;
    }

    this.logger.log("[TokenManager] Refreshing bearer token via session...");

    try {
      const response = await fetchWithRetry(SESSION_ENDPOINT, {
        method: "GET",
        headers: {
          Cookie: `__Secure-next-auth.session-token=${this.config.sessionToken}`,
        },
        maxRetries: 1,
        timeout: 30_000,
        logger: this.logger,
      });

      if (!response.ok) {
        throw new GLabsError(
          `Session refresh failed: ${response.status} ${response.statusText}`,
          "AUTH_ERROR",
          response.status
        );
      }

      const session = (await response.json()) as SessionResponse;

      if (session.error === "ACCESS_TOKEN_REFRESH_NEEDED" || session.error) {
        throw new GLabsError(
          `Session cookie expired: ${session.error}`,
          "AUTH_ERROR"
        );
      }

      if (!session.access_token) {
        throw new GLabsError(
          "No access_token in session response",
          "AUTH_ERROR"
        );
      }

      // Update config in-place so all services see the new token
      (this.config as { bearerToken: string }).bearerToken =
        session.access_token;
      this.tokenExpiry = session.expires
        ? new Date(session.expires)
        : new Date(Date.now() + 3 * 60 * 60 * 1000);

      const email = session.user?.email ?? "unknown";
      const expiresIn = Math.round(
        (this.tokenExpiry.getTime() - Date.now()) / 60_000
      );
      this.logger.log(
        `[TokenManager] Token refreshed (user: ${email}, expires in ${expiresIn}m)`
      );
    } catch (error) {
      // Fallback to extraction if configured
      if (this.config.tokenExtractor) {
        this.logger.warn(
          `[TokenManager] ST→AT failed, falling back to Browserless extraction...`
        );
        await this.doExtractFallback();
        return;
      }
      throw error;
    }
  }

  /** Fallback: extract tokens via Browserless */
  private async doExtractFallback(): Promise<void> {
    const result = await TokenExtractorService.extract(
      this.config.tokenExtractor!,
      this.logger
    );

    if (!result.success || !result.bearerToken) {
      throw new GLabsError(
        `Token extraction failed: ${result.error ?? "unknown"}`,
        "AUTH_ERROR"
      );
    }

    // Update bearer token
    (this.config as { bearerToken: string }).bearerToken = result.bearerToken;
    this.tokenExpiry = result.expiresAt ?? new Date(Date.now() + 3 * 60 * 60 * 1000);

    // Update session token if captured
    if (result.sessionToken) {
      (this.config as { sessionToken?: string }).sessionToken =
        result.sessionToken;
      this.logger.log("[TokenManager] Session token updated from extraction");
    }

    const expiresIn = Math.round(
      (this.tokenExpiry.getTime() - Date.now()) / 60_000
    );
    this.logger.log(
      `[TokenManager] Token extracted via Browserless (expires in ${expiresIn}m)`
    );
  }
}
