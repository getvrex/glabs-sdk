/**
 * reCAPTCHA Token Service
 *
 * Supports YesCaptcha and CapSolver providers for solving reCAPTCHA v3 Enterprise.
 */

import { DEFAULTS, RECAPTCHA_CONFIG } from "../constants";
import type { GLabsLogger } from "../types/client";
import type {
  CapSolverCreateTaskResponse,
  CapSolverGetResultResponse,
  RecaptchaConfig,
  RecaptchaProvider,
  RecaptchaTokenResult,
  YesCaptchaCreateTaskResponse,
  YesCaptchaGetResultResponse,
} from "../types/recaptcha";
import { GLabsError, sleep } from "../utils";

/** Options for the reCAPTCHA service */
export type RecaptchaServiceOptions = {
  /** Logger instance */
  logger?: GLabsLogger;
};

/** reCAPTCHA service for obtaining tokens */
export class RecaptchaService {
  private readonly logger: GLabsLogger;

  constructor(options: RecaptchaServiceOptions = {}) {
    this.logger = options.logger ?? console;
  }

  /**
   * Get a reCAPTCHA token using the configured provider
   */
  async getToken(config: RecaptchaConfig): Promise<RecaptchaTokenResult> {
    const { provider, apiKey, proxy, maxRetries } = config;

    if (!apiKey) {
      throw new GLabsError(
        `${provider} API key is required`,
        "RECAPTCHA_CONFIG_ERROR"
      );
    }

    if (provider === "capsolver") {
      return await this.getTokenFromCapSolver(apiKey, maxRetries, proxy);
    }

    return await this.getTokenFromYesCaptcha(apiKey, maxRetries);
  }

  /**
   * Get token from YesCaptcha service
   */
  private async getTokenFromYesCaptcha(
    clientKey: string,
    maxRetries: number = DEFAULTS.RECAPTCHA_MAX_RETRIES
  ): Promise<RecaptchaTokenResult> {
    this.logger.log(
      `[reCAPTCHA] Requesting token from YesCaptcha (Action: ${RECAPTCHA_CONFIG.PAGE_ACTION})`
    );

    const taskId = await this.createYesCaptchaTask(clientKey);
    this.logger.log(`[reCAPTCHA] Task created (ID: ${taskId}), polling...`);

    for (let i = 0; i < maxRetries; i++) {
      await sleep(DEFAULTS.RECAPTCHA_POLL_INTERVAL);

      const result = await this.getYesCaptchaResult(clientKey, taskId);

      if (result.status === "ready" && result.solution) {
        const token = result.solution.gRecaptchaResponse;
        this.logger.log(
          `[reCAPTCHA] Token obtained: ${token.substring(0, 50)}...`
        );
        return { token };
      }

      if (result.status === "processing") {
        this.logger.log(`[reCAPTCHA] Processing... ${i + 1}/${maxRetries}`);
        continue;
      }

      throw new GLabsError(
        `YesCaptcha task failed: ${JSON.stringify(result)}`,
        "RECAPTCHA_FAILED"
      );
    }

    throw new GLabsError(
      `YesCaptcha timeout after ${maxRetries} attempts`,
      "RECAPTCHA_TIMEOUT"
    );
  }

  /**
   * Get token from CapSolver service
   */
  private async getTokenFromCapSolver(
    apiKey: string,
    maxRetries = 30,
    proxy?: string
  ): Promise<RecaptchaTokenResult> {
    this.logger.log(
      `[reCAPTCHA] Requesting token from CapSolver (Action: ${RECAPTCHA_CONFIG.PAGE_ACTION})`
    );

    const taskId = await this.createCapSolverTask(apiKey, proxy);
    this.logger.log(`[reCAPTCHA] Task created (ID: ${taskId}), polling...`);

    const startTime = Date.now();

    for (let i = 0; i < maxRetries; i++) {
      await sleep(DEFAULTS.CAPSOLVER_POLL_INTERVAL);

      const result = await this.getCapSolverResult(apiKey, taskId);

      if (result.status === "ready" && result.solution) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        this.logger.log(
          `[reCAPTCHA] Token obtained (${elapsed}s): ${result.solution.gRecaptchaResponse.substring(
            0,
            50
          )}...`
        );
        return {
          token: result.solution.gRecaptchaResponse,
          userAgent: result.solution.userAgent,
          secChUa: result.solution.secChUa,
        };
      }

      if (result.status === "failed") {
        throw new GLabsError(
          `CapSolver task failed: ${
            result.errorDescription ?? "Unknown error"
          }`,
          "RECAPTCHA_FAILED"
        );
      }

      if (result.status === "processing") {
        this.logger.log(`[reCAPTCHA] Processing... ${i + 1}/${maxRetries}`);
      }
    }

    throw new GLabsError(
      `CapSolver timeout after ${maxRetries} attempts`,
      "RECAPTCHA_TIMEOUT"
    );
  }

  /**
   * Create a YesCaptcha task
   */
  private async createYesCaptchaTask(clientKey: string): Promise<string> {
    const response = await fetch(
      `${RECAPTCHA_CONFIG.YESCAPTCHA_API_BASE}/createTask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientKey,
          task: {
            type: "RecaptchaV3TaskProxylessM1S7",
            websiteURL: RECAPTCHA_CONFIG.WEBSITE_URL,
            websiteKey: RECAPTCHA_CONFIG.WEBSITE_KEY,
            pageAction: RECAPTCHA_CONFIG.PAGE_ACTION,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new GLabsError(
        `YesCaptcha API error: ${response.status} ${response.statusText}`,
        "RECAPTCHA_API_ERROR"
      );
    }

    const result = (await response.json()) as YesCaptchaCreateTaskResponse;

    if (result.errorId !== 0) {
      throw new GLabsError(
        `YesCaptcha create task failed: [${result.errorCode}] ${
          result.errorDescription ?? "Unknown error"
        }`,
        "RECAPTCHA_CREATE_TASK_ERROR"
      );
    }

    if (!result.taskId) {
      throw new GLabsError(
        "YesCaptcha create task failed: No taskId returned",
        "RECAPTCHA_CREATE_TASK_ERROR"
      );
    }

    return result.taskId;
  }

  /**
   * Get YesCaptcha task result
   */
  private async getYesCaptchaResult(
    clientKey: string,
    taskId: string
  ): Promise<YesCaptchaGetResultResponse> {
    const response = await fetch(
      `${RECAPTCHA_CONFIG.YESCAPTCHA_API_BASE}/getTaskResult`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey, taskId }),
      }
    );

    if (!response.ok) {
      throw new GLabsError(
        `YesCaptcha API error: ${response.status} ${response.statusText}`,
        "RECAPTCHA_API_ERROR"
      );
    }

    const result = (await response.json()) as YesCaptchaGetResultResponse;

    if (result.errorId !== 0) {
      throw new GLabsError(
        `YesCaptcha get result failed: [${result.errorCode}] ${
          result.errorDescription ?? "Unknown error"
        }`,
        "RECAPTCHA_GET_RESULT_ERROR"
      );
    }

    return result;
  }

  /**
   * Create a CapSolver task
   */
  private async createCapSolverTask(
    apiKey: string,
    proxy?: string
  ): Promise<string> {
    const taskPayload: Record<string, unknown> = {
      type: proxy
        ? "ReCaptchaV3EnterpriseTask"
        : "ReCaptchaV3EnterpriseTaskProxyLess",
      websiteURL: RECAPTCHA_CONFIG.WEBSITE_URL,
      websiteKey: RECAPTCHA_CONFIG.WEBSITE_KEY,
      pageAction: RECAPTCHA_CONFIG.PAGE_ACTION,
      minScore: 0.9,
    };

    if (proxy) {
      taskPayload.proxy = proxy;
      this.logger.log(`[reCAPTCHA] Using proxy: ${proxy}`);
    }

    const response = await fetch(
      `${RECAPTCHA_CONFIG.CAPSOLVER_API_BASE}/createTask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientKey: apiKey,
          task: taskPayload,
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new GLabsError(
        `CapSolver API error: ${response.status} ${response.statusText}\nResponse: ${responseText}`,
        "RECAPTCHA_API_ERROR"
      );
    }

    const result: CapSolverCreateTaskResponse = JSON.parse(responseText);

    if (result.errorId !== 0) {
      throw new GLabsError(
        `CapSolver create task failed: [${result.errorCode}] ${
          result.errorDescription ?? "Unknown error"
        }`,
        "RECAPTCHA_CREATE_TASK_ERROR"
      );
    }

    if (!result.taskId) {
      throw new GLabsError(
        "CapSolver create task failed: No taskId returned",
        "RECAPTCHA_CREATE_TASK_ERROR"
      );
    }

    return result.taskId;
  }

  /**
   * Get CapSolver task result
   */
  private async getCapSolverResult(
    apiKey: string,
    taskId: string
  ): Promise<CapSolverGetResultResponse> {
    const response = await fetch(
      `${RECAPTCHA_CONFIG.CAPSOLVER_API_BASE}/getTaskResult`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: apiKey, taskId }),
      }
    );

    if (!response.ok) {
      throw new GLabsError(
        `CapSolver API error: ${response.status} ${response.statusText}`,
        "RECAPTCHA_API_ERROR"
      );
    }

    const result = (await response.json()) as CapSolverGetResultResponse;

    if (result.errorId !== 0 && result.status !== "processing") {
      throw new GLabsError(
        `CapSolver get result failed: [${result.errorCode}] ${
          result.errorDescription ?? "Unknown error"
        }`,
        "RECAPTCHA_GET_RESULT_ERROR"
      );
    }

    return result;
  }
}

/** Default provider for convenience */
export const defaultRecaptchaProvider: RecaptchaProvider = "yescaptcha";
