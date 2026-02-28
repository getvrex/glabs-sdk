/**
 * Client configuration and options types
 */

import type { AccountTier } from "./common";
import type { RecaptchaConfig } from "./recaptcha";

/** Configuration for automated token extraction */
export type TokenExtractorConfig = {
  googleEmail: string;
  googlePassword: string;
  /** Browserless.io token — if omitted, launches local Chromium */
  browserlessToken?: string;
};

/** Result of a token extraction attempt */
export type TokenExtractionResult = {
  success: boolean;
  bearerToken?: string;
  sessionToken?: string;
  sessionExpiresAt?: Date;
  credits?: number;
  tier?: string;
  expiresAt?: Date;
  error?: string;
};

/** Configuration for the GLabs client */
export type GLabsClientConfig = {
  /** Bearer token for authentication (Google AI APIs) */
  bearerToken: string;
  /** Session token for project API (__Secure-next-auth.session-token cookie value) */
  sessionToken?: string;
  /** Account tier (pro or ultra) */
  accountTier?: AccountTier;
  /** Project ID (optional, can be provided per-request) */
  projectId?: string;
  /** reCAPTCHA configuration */
  recaptcha?: RecaptchaConfig;
  /** Token extractor config for automated Browserless token refresh */
  tokenExtractor?: TokenExtractorConfig;
  /** Custom logger (defaults to console) */
  logger?: GLabsLogger;
  /** Request timeout in milliseconds (default: 120000) */
  timeout?: number;
  /** Maximum retry attempts for network errors (default: 2) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 1500) */
  retryDelay?: number;
};

/** Logger interface for custom logging */
export type GLabsLogger = {
  log: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

/** Internal resolved configuration */
export type ResolvedConfig = {
  bearerToken: string;
  sessionToken?: string;
  accountTier: AccountTier;
  projectId?: string;
  recaptcha?: RecaptchaConfig;
  tokenExtractor?: TokenExtractorConfig;
  logger: GLabsLogger;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
};

/** Session info for API requests */
export type SessionInfo = {
  sessionId: string;
  projectId?: string;
};
