/**
 * Error handling utilities
 */

import { ERROR_CODES } from "../constants";

/** Custom error class for GLabs SDK */
export class GLabsError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  override readonly cause?: unknown;

  constructor(
    message: string,
    code: string = ERROR_CODES.UNKNOWN,
    statusCode?: number,
    cause?: unknown
  ) {
    super(message);
    this.name = "GLabsError";
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/** Check if an error is a network error (retryable) */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("enotfound") ||
    message.includes("failed to fetch") ||
    error.name === "TypeError" ||
    error.name === "AbortError"
  );
}

/** Parse Google API error response and return user-friendly message */
export function parseGoogleApiError(
  errorData: unknown,
  statusCode: number
): GLabsError {
  const data = errorData as Record<string, unknown> | undefined;
  const errorObj = data?.error as Record<string, unknown> | undefined;

  const errorMessage =
    (errorObj?.message as string) || (data?.message as string) || "";
  const errorStatus =
    (errorObj?.status as string) || (data?.status as string) || "";

  // High traffic error
  if (
    errorMessage.includes("HIGH_TRAFFIC") ||
    errorMessage.includes("PUBLIC_ERROR_HIGH_TRAFFIC")
  ) {
    return new GLabsError(
      "Service busy, please try again later",
      ERROR_CODES.HIGH_TRAFFIC,
      statusCode
    );
  }

  // Internal error
  if (
    errorStatus === "INTERNAL" ||
    errorMessage.toLowerCase().includes("internal error") ||
    statusCode === 500
  ) {
    return new GLabsError(
      "Network error, please try a different node",
      ERROR_CODES.INTERNAL_ERROR,
      statusCode
    );
  }

  // Invalid argument - content violation
  if (
    errorStatus === "INVALID_ARGUMENT" ||
    errorMessage.toLowerCase().includes("invalid argument") ||
    statusCode === 400
  ) {
    return new GLabsError(
      "Prompt or image content violates policy, please modify and retry",
      ERROR_CODES.INVALID_ARGUMENT,
      statusCode
    );
  }

  // Permission denied
  if (
    errorStatus === "PERMISSION_DENIED" ||
    statusCode === 403
  ) {
    const details = (errorObj?.details as unknown[]) ?? [];
    const detailStr = details.length > 0 ? `\nDetails: ${JSON.stringify(details)}` : "";
    return new GLabsError(
      `Permission denied: ${errorMessage || "The caller does not have permission"}${detailStr}`,
      ERROR_CODES.PERMISSION_DENIED,
      statusCode
    );
  }

  // Default error — include original message for debugging
  return new GLabsError(
    errorMessage || "Request failed, please try again later",
    ERROR_CODES.UNKNOWN,
    statusCode
  );
}

/** Parse video operation error and return user-friendly message with raw details */
export function parseVideoOperationError(operation: unknown): string {
  const op = operation as Record<string, unknown> | undefined;
  const innerOp = op?.operation as Record<string, unknown> | undefined;
  const error = innerOp?.error as Record<string, unknown> | undefined;

  const errorMessage = (error?.message as string) || "";
  const errorCode = error?.code as number | undefined;
  const errorStatus = error?.status as string | undefined;

  // Build raw detail suffix for debugging
  const rawParts: string[] = [];
  if (errorCode !== undefined) rawParts.push(`code=${errorCode}`);
  if (errorStatus) rawParts.push(`status=${errorStatus}`);
  if (errorMessage) rawParts.push(`msg=${errorMessage}`);
  const rawDetail = rawParts.length > 0 ? ` [${rawParts.join(", ")}]` : "";

  // High traffic error
  if (
    errorMessage.includes("HIGH_TRAFFIC") ||
    errorMessage.includes("PUBLIC_ERROR_HIGH_TRAFFIC")
  ) {
    return `Service busy, please try again later${rawDetail}`;
  }

  // Code 13 is usually an internal error
  if (errorCode === 13) {
    return `Service busy (internal error)${rawDetail}`;
  }

  // Invalid argument
  if (
    errorMessage.toLowerCase().includes("invalid") ||
    errorMessage.toLowerCase().includes("argument")
  ) {
    return `Prompt or image content violates policy, please modify and retry${rawDetail}`;
  }

  // Include raw details so callers can diagnose unknown failures
  return `Video generation failed${rawDetail || ", no error details returned"}`;
}

/** Check if response requires reCAPTCHA */
export function isRecaptchaRequired(
  statusCode: number,
  responseData: unknown
): boolean {
  if (statusCode !== 403) {
    return false;
  }

  const data = responseData as Record<string, unknown> | undefined;
  const errorObj = data?.error as Record<string, unknown> | undefined;

  const errorMessage = (errorObj?.message as string) || "";
  const errorStatus = (errorObj?.status as string) || "";

  return (
    errorMessage.toLowerCase().includes("recaptcha") ||
    errorMessage.toLowerCase().includes("captcha") ||
    errorStatus === "PERMISSION_DENIED"
  );
}

/** Check if reCAPTCHA token evaluation failed (need to retry with new token) */
export function isRecaptchaEvaluationFailed(
  statusCode: number,
  responseData: unknown
): boolean {
  if (statusCode !== 403) {
    return false;
  }

  const data = responseData as Record<string, unknown> | undefined;
  const errorObj = data?.error as Record<string, unknown> | undefined;

  const errorMessage = (errorObj?.message as string) || "";

  return errorMessage.toLowerCase().includes("recaptcha evaluation failed");
}
