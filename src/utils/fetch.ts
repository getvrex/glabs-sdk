/**
 * Fetch utilities with retry logic
 */

import { DEFAULT_HEADERS, DEFAULTS } from "../constants";
import type { GLabsLogger } from "../types/client";
import { GLabsError, isNetworkError } from "./errors";

/** Options for fetch with retry */
export interface FetchOptions extends RequestInit {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Logger instance */
  logger?: GLabsLogger;
}

/** Make a fetch request with automatic retry on network errors */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    maxRetries = DEFAULTS.MAX_RETRIES,
    retryDelay = DEFAULTS.RETRY_DELAY,
    timeout = DEFAULTS.TIMEOUT,
    logger = console,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;

      // Only retry on network errors
      if (isNetworkError(error) && attempt < maxRetries) {
        logger.warn(
          `Network error, retrying in ${retryDelay}ms (${attempt + 1}/${maxRetries}):`,
          lastError.message
        );
        await sleep(retryDelay);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new GLabsError("Request failed after retries");
}

/** Build request headers with bearer token */
export function buildHeaders(
  bearerToken: string,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  return {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${bearerToken}`,
    ...additionalHeaders,
  };
}

/** Build headers with browser fingerprint from reCAPTCHA result */
export function buildHeadersWithFingerprint(
  bearerToken: string,
  fingerprint?: { userAgent?: string; secChUa?: string }
): Record<string, string> {
  const headers = buildHeaders(bearerToken);

  if (fingerprint?.userAgent) {
    headers["User-Agent"] = fingerprint.userAgent;
  }
  if (fingerprint?.secChUa) {
    headers["sec-ch-ua"] = fingerprint.secChUa;
  }

  return headers;
}

/** Sleep for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a unique ID */
export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Generate a random seed for generation */
export function generateSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}
