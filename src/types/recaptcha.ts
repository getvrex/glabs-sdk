/**
 * reCAPTCHA types for token generation services
 */

/** Supported reCAPTCHA service providers */
export type RecaptchaProvider = "yescaptcha" | "capsolver" | "regotcha" | "custom" | "veo3solver" | "playwright" | "chrome";

/** reCAPTCHA configuration */
export type RecaptchaConfig = {
  /** Provider to use for solving reCAPTCHA */
  provider: RecaptchaProvider;
  /** API key for the provider (not required for custom/veo3solver/static providers) */
  apiKey?: string;
  /** Proxy address (supported by CapSolver and custom providers) */
  proxy?: string;
  /** Maximum retry attempts for polling */
  maxRetries?: number;
  /** Custom solver endpoint URL (required when provider is 'custom') */
  customEndpoint?: string;
  /** Custom solver anchor parameter (optional) */
  anchor?: string;
  /** Custom solver reload parameter (optional) */
  reload?: string;
  /** JWT token for veo3solver provider */
  jwtToken?: string;
  /** Static token to use directly (bypasses provider, useful for testing) */
  staticToken?: string;
  /** Override the reCAPTCHA page action (e.g. for video vs image) */
  pageAction?: string;
  /** Playwright browser options (only for playwright provider) */
  playwrightOptions?: PlaywrightRecaptchaOptions;
  /** Chrome browser options (only for chrome provider) */
  chromeOptions?: ChromeRecaptchaOptions;
  /** Fallback provider config when primary provider fails to produce a token */
  fallback?: RecaptchaConfig;
};

/** Playwright browser reCAPTCHA options */
export type PlaywrightRecaptchaOptions = {
  /** Run browser in headless mode (default: false - headed gets higher reCAPTCHA scores) */
  headless?: boolean;
  /** Browser proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  /** Project ID for the page URL context */
  projectId?: string;
  /** Maximum retry attempts per token request (default: 3) */
  maxRetries?: number;
  /** Timeout for script execution in ms (default: 30000) */
  timeout?: number;
};

/** Chrome browser reCAPTCHA options (persistent context, real Chrome) */
export type ChromeRecaptchaOptions = {
  /** Run browser in headless mode (default: false - headed gets higher reCAPTCHA scores) */
  headless?: boolean;
  /** Browser proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  /** Project ID for the page URL context */
  projectId?: string;
  /** Maximum retry attempts per token request (default: 3) */
  maxRetries?: number;
  /** Timeout for page load/script execution in ms (default: 30000) */
  timeout?: number;
  /** Path for persistent browser profile (default: ~/.glabs-sdk/chrome-profile) */
  userDataDir?: string;
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

/** Custom solver request payload */
export type CustomSolverRequest = {
  websiteURL: string;
  websiteKey: string;
  pageAction: string;
  anchor?: string;
  reload?: string;
  proxy?: string;
  headless?: boolean;
};

/** Custom solver response */
export type CustomSolverResponse = {
  success: boolean;
  token?: string;
  error?: string;
};

/** Veo3Solver response */
export type Veo3SolverResponse = {
  success: boolean;
  token?: string;
  age?: number;
  countTokens?: number;
};

/** Regotcha create task response */
export type RegotchaCreateTaskResponse = {
  errorId?: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: string;
};

/** Regotcha get result response */
export type RegotchaGetResultResponse = {
  errorId?: number;
  status: "processing" | "ready" | "failed";
  solution?: {
    gRecaptchaResponse: string;
  };
  errorCode?: string;
  errorDescription?: string;
};
