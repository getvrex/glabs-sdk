/**
 * reCAPTCHA types for token generation services
 */

/** Supported reCAPTCHA service providers */
export type RecaptchaProvider = "yescaptcha" | "capsolver";

/** reCAPTCHA configuration */
export type RecaptchaConfig = {
  /** Provider to use for solving reCAPTCHA */
  provider: RecaptchaProvider;
  /** API key for the provider */
  apiKey: string;
  /** Proxy address (only supported by CapSolver) */
  proxy?: string;
  /** Maximum retry attempts for polling */
  maxRetries?: number;
};

/** Result from reCAPTCHA token request */
export type RecaptchaTokenResult = {
  /** The reCAPTCHA token */
  token: string;
  /** User agent string (provided by CapSolver) */
  userAgent?: string;
  /** sec-ch-ua header value (provided by CapSolver) */
  secChUa?: string;
};

/** YesCaptcha create task response */
export type YesCaptchaCreateTaskResponse = {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: string;
};

/** YesCaptcha get result response */
export type YesCaptchaGetResultResponse = {
  errorId: number;
  status: "processing" | "ready";
  solution?: {
    gRecaptchaResponse: string;
  };
  errorCode?: string;
  errorDescription?: string;
};

/** CapSolver create task response */
export type CapSolverCreateTaskResponse = {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: string;
};

/** CapSolver get result response */
export type CapSolverGetResultResponse = {
  errorId: number;
  status: "processing" | "ready" | "failed";
  solution?: {
    gRecaptchaResponse: string;
    userAgent?: string;
    secChUa?: string;
  };
  errorCode?: string;
  errorDescription?: string;
};
