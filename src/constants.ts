/**
 * SDK Constants and API Endpoints
 */

/** Google Labs API base URL */
export const GLABS_API_BASE = "https://aisandbox-pa.googleapis.com/v1";

/** API Endpoints */
export const ENDPOINTS = {
  // Image endpoints
  UPLOAD_IMAGE: `${GLABS_API_BASE}:uploadUserImage`,
  GET_CREDIT_STATUS: `${GLABS_API_BASE}/whisk:getVideoCreditStatus`,

  // Image generation (requires projectId in path)
  BATCH_GENERATE_IMAGES: (projectId: string) =>
    `${GLABS_API_BASE}/projects/${projectId}/flowMedia:batchGenerateImages`,

  // Video endpoints
  TEXT_TO_VIDEO: `${GLABS_API_BASE}/video:batchAsyncGenerateVideoText`,
  IMAGE_TO_VIDEO_START: `${GLABS_API_BASE}/video:batchAsyncGenerateVideoStartImage`,
  IMAGE_TO_VIDEO_START_END: `${GLABS_API_BASE}/video:batchAsyncGenerateVideoStartAndEndImage`,
  EXTEND_VIDEO: `${GLABS_API_BASE}/video:batchAsyncGenerateVideoExtendVideo`,
  RESHOOT_VIDEO: `${GLABS_API_BASE}/video:batchAsyncGenerateVideoReshootVideo`,
  UPSAMPLE_VIDEO: `${GLABS_API_BASE}/video:batchAsyncGenerateVideoUpsampleVideo`,
  REFERENCE_IMAGES_VIDEO: `${GLABS_API_BASE}/video:batchAsyncGenerateVideoReferenceImages`,
  CHECK_VIDEO_STATUS: `${GLABS_API_BASE}/video:batchCheckAsyncVideoGenerationStatus`,
} as const;

/** reCAPTCHA service URLs */
export const RECAPTCHA_CONFIG = {
  YESCAPTCHA_API_BASE: "https://api.yescaptcha.com",
  CAPSOLVER_API_BASE: "https://api.capsolver.com",
  WEBSITE_KEY: "6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV",
  WEBSITE_URL: "https://labs.google/",
  PAGE_ACTION: "FLOW_GENERATION",
} as const;

/** Default request headers */
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Origin: "https://labs.google",
  Referer: "https://labs.google/",
} as const;

/** Default configuration values */
export const DEFAULTS = {
  TIMEOUT: 120_000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1500,
  IMAGE_COUNT: 1,
  MAX_IMAGE_COUNT: 4,
  RECAPTCHA_MAX_RETRIES: 20,
  RECAPTCHA_POLL_INTERVAL: 3000,
  CAPSOLVER_POLL_INTERVAL: 2000,
  RECAPTCHA_EVAL_MAX_RETRIES: 3,
  VIDEO_EXTEND_START_FRAME: 168,
  VIDEO_EXTEND_END_FRAME: 191,
} as const;

/** Error codes */
export const ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  HIGH_TRAFFIC: "HIGH_TRAFFIC",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  RECAPTCHA_REQUIRED: "RECAPTCHA_REQUIRED",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
} as const;
