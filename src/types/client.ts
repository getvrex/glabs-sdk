/**
 * Client configuration and options types
 */

import type { AccountTier } from "./common";
import type { RecaptchaConfig } from "./recaptcha";

/** Vertex AI configuration for Imagen models */
export type VertexAIConfig = {
  /** OAuth2 access token for Vertex AI */
  accessToken: string;
  /** Google Cloud project ID */
  projectId: string;
  /** Vertex AI location (default: "us-central1") */
  location?: string;
  /** Video model ID (default: "veo-3.0-generate-preview") */
  videoModelId?: string;
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
  /** Vertex AI configuration for Imagen models */
  vertexAI?: VertexAIConfig;
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
  vertexAI?: VertexAIConfig;
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
