/**
 * Token Manager Service
 *
 * Manages bearer token lifecycle with automatic refresh via session token.
 * Uses the same ST→AT pattern as flow2api: calls the Google Labs session
 * endpoint with the session-token cookie to obtain a fresh access token.
 */

import type { GLabsLogger, ResolvedConfig } from "../types/client";
import { fetchWithRetry } from "../utils/fetch";
import { GLabsError } from "../utils/errors";

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
    if (!this.config.sessionToken) {
      return; // No session token = can't refresh, use bearer as-is
    }

    if (!this.needsRefresh()) {
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
    if (!this.config.sessionToken) {
      throw new GLabsError(
        "Cannot refresh token: no sessionToken configured. Provide sessionToken (__Secure-next-auth.session-token cookie) in client config.",
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

  /** Check whether the token needs refreshing */
  private needsRefresh(): boolean {
    // No known expiry = needs refresh (first call, or after forced invalidation)
    if (!this.tokenExpiry) {
      return true;
    }

    // Proactive refresh: refresh if less than threshold remains
    return Date.now() + REFRESH_THRESHOLD_MS >= this.tokenExpiry.getTime();
  }

  /** Perform the actual ST→AT refresh */
  private async doRefresh(): Promise<void> {
    this.logger.log("[TokenManager] Refreshing bearer token via session...");

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
        `Session cookie expired or invalid: ${session.error}. Get a fresh __Secure-next-auth.session-token from labs.google.`,
        "AUTH_ERROR"
      );
    }

    if (!session.access_token) {
      throw new GLabsError(
        "No access_token in session response",
        "AUTH_ERROR"
      );
    }

    // Update the config in-place so all services see the new token
    (this.config as { bearerToken: string }).bearerToken = session.access_token;
    this.tokenExpiry = session.expires
      ? new Date(session.expires)
      : new Date(Date.now() + 3 * 60 * 60 * 1000); // Default 3h if no expiry

    const email = session.user?.email ?? "unknown";
    const expiresIn = Math.round(
      (this.tokenExpiry.getTime() - Date.now()) / 60_000
    );
    this.logger.log(
      `[TokenManager] Token refreshed (user: ${email}, expires in ${expiresIn}m)`
    );
  }
}
