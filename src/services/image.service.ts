/**
 * Image Generation Service
 *
 * Handles image uploads, generation, and credit status.
 */

import { getImageApiConfig } from "../config/tier-config";
import { DEFAULTS, ENDPOINTS } from "../constants";
import type { GLabsLogger, ResolvedConfig } from "../types/client";
import type {
  CreditStatusResult,
  GeneratedImage,
  GenerateImageOptions,
  GenerateImageResult,
  UploadImageOptions,
  UploadImageResult,
} from "../types/image";
import {
  buildHeaders,
  buildHeadersWithFingerprint,
  fetchWithRetry,
  GLabsError,
  generateSeed,
  isRecaptchaEvaluationFailed,
  parseGoogleApiError,
} from "../utils";
import type { RecaptchaService } from "./recaptcha.service";

/** Regex to parse data URL format */
const DATA_URL_REGEX = /^data:(.*?);base64,(.*)$/;

/** Options for creating an image service instance */
export type ImageServiceOptions = {
  /** Resolved client configuration */
  config: ResolvedConfig;
  /** reCAPTCHA service instance */
  recaptchaService: RecaptchaService;
};

/** Image generation service */
export class ImageService {
  private readonly config: ResolvedConfig;
  private readonly recaptchaService: RecaptchaService;
  private readonly logger: GLabsLogger;

  constructor(options: ImageServiceOptions) {
    this.config = options.config;
    this.recaptchaService = options.recaptchaService;
    this.logger = options.config.logger;
  }

  /**
   * Get video credit status for the account
   */
  async getCreditStatus(): Promise<CreditStatusResult> {
    const headers = buildHeaders(this.config.bearerToken);
    headers["Content-Type"] = "text/plain;charset=UTF-8";

    const response = await fetch(ENDPOINTS.GET_CREDIT_STATUS, {
      method: "POST",
      headers,
      body: "{}",
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        "Failed to get credit status:",
        response.status,
        errorText
      );
      throw new GLabsError(
        `Failed to get credits: ${response.status} ${response.statusText}`,
        "CREDIT_STATUS_ERROR",
        response.status
      );
    }

    return (await response.json()) as CreditStatusResult;
  }

  /**
   * Upload an image to Google Labs
   */
  async uploadImage(options: UploadImageOptions): Promise<UploadImageResult> {
    const { imageBase64, sessionId, aspectRatio } = options;

    // Process base64 data
    let base64Data = imageBase64.trim();
    let mimeType = "image/jpeg";

    const dataUrlMatch = DATA_URL_REGEX.exec(base64Data);
    if (dataUrlMatch?.[2]) {
      mimeType = dataUrlMatch[1] ?? mimeType;
      base64Data = dataUrlMatch[2];
    }

    const sanitizedBase64 = base64Data.replace(/\s/g, "");

    // Normalize aspect ratio
    const normalizedAspectRatio = this.getImageAspectRatioEnum(aspectRatio);

    const payload = {
      imageInput: {
        rawImageBytes: sanitizedBase64,
        mimeType,
        isUserUploaded: true,
        aspectRatio: normalizedAspectRatio,
      },
      clientContext: {
        sessionId: sessionId.trim(),
        tool: "ASSET_MANAGER",
      },
    };

    const headers = buildHeaders(this.config.bearerToken);

    const response = await fetchWithRetry(ENDPOINTS.UPLOAD_IMAGE, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      timeout: this.config.timeout,
      logger: this.logger,
    });

    if (!response.ok) {
      throw new GLabsError(
        `Upload failed: ${response.status} ${response.statusText}`,
        "UPLOAD_ERROR",
        response.status
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    this.logger.log("[Image] Upload response:", JSON.stringify(data, null, 2));

    const mediaGenIdObj = data.mediaGenerationId as
      | Record<string, unknown>
      | undefined;
    const mediaGenId = mediaGenIdObj?.mediaGenerationId as string | undefined;

    return {
      mediaGenerationId: mediaGenId,
      mediaId: mediaGenId,
      width: data.width as number | undefined,
      height: data.height as number | undefined,
      workflowId: data.workflowId as string | undefined,
      sessionId: sessionId.trim(),
    };
  }

  /**
   * Generate images from a prompt
   */
  async generateImage(
    options: GenerateImageOptions
  ): Promise<GenerateImageResult> {
    const {
      prompt,
      projectId,
      sessionId,
      aspectRatio,
      references,
      seed,
      count,
      model,
      prompts,
    } = options;

    // Require reCAPTCHA configuration
    if (!this.config.recaptcha) {
      throw new GLabsError(
        "reCAPTCHA configuration is required for image generation",
        "RECAPTCHA_REQUIRED"
      );
    }

    // Get image config
    const imageConfig = getImageApiConfig(
      this.config.accountTier,
      aspectRatio,
      model
    );

    const generationCount = Math.max(
      1,
      Math.min(DEFAULTS.MAX_IMAGE_COUNT, count ?? 1)
    );
    const imageModelName = imageConfig.imageModelName;

    // Process reference images
    const imageInputs =
      Array.isArray(references) && references.length > 0
        ? references
            .filter(
              (ref) =>
                (typeof ref?.mediaId === "string" &&
                  ref.mediaId.trim().length > 0) ||
                (typeof ref?.mediaGenerationId === "string" &&
                  ref.mediaGenerationId.trim().length > 0)
            )
            .map((ref) => ({
              name: ref.mediaId ?? ref.mediaGenerationId,
              imageInputType: "IMAGE_INPUT_TYPE_REFERENCE",
            }))
        : [];

    // Build requests
    const requestCount =
      prompts && prompts.length > 0 ? prompts.length : generationCount;

    const buildRequests = (recaptchaToken: string) =>
      Array.from({ length: requestCount }, (_, index) => {
        const requestSeed =
          typeof seed === "number" ? seed + index : generateSeed();
        const requestPrompt = prompts?.[index] ?? prompt;

        return {
          clientContext: {
            recaptchaContext: {
              token: recaptchaToken,
              applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
            },
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
          },
          seed: requestSeed,
          imageModelName,
          imageAspectRatio: imageConfig.aspectRatioEnum,
          prompt: requestPrompt,
          imageInputs,
        };
      });

    const buildPayload = (recaptchaToken: string) => ({
      clientContext: {
        recaptchaContext: {
          token: recaptchaToken,
          applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
        },
        sessionId: sessionId.trim(),
        projectId: projectId.trim(),
        tool: "PINHOLE",
      },
      requests: buildRequests(recaptchaToken),
    });

    const url = ENDPOINTS.BATCH_GENERATE_IMAGES(projectId.trim());

    // Don't retry if using static token - it won't change between attempts
    const usingStaticToken = Boolean(this.config.recaptcha.staticToken);
    const maxEvalRetries = usingStaticToken
      ? 1
      : DEFAULTS.RECAPTCHA_EVAL_MAX_RETRIES;

    // Retry loop for reCAPTCHA evaluation failures
    for (let attempt = 1; attempt <= maxEvalRetries; attempt++) {
      this.logger.log(
        `[Image] Fetching reCAPTCHA token (attempt ${attempt}/${maxEvalRetries})...`
      );
      const recaptchaResult = await this.recaptchaService.getToken(
        this.config.recaptcha
      );
      this.logger.log("[Image] reCAPTCHA token obtained, generating...");

      const headers = buildHeadersWithFingerprint(
        this.config.bearerToken,
        recaptchaResult
      );
      headers["Content-Type"] = "text/plain;charset=UTF-8";

      const response = await fetchWithRetry(url, {
        method: "POST",
        headers,
        body: JSON.stringify(buildPayload(recaptchaResult.token)),
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        timeout: this.config.timeout,
        logger: this.logger,
      });

      if (response.ok) {
        const rawData = await response.json();
        return this.parseImageResponse(rawData, prompt, sessionId);
      }

      const errorData = await response.json().catch(() => ({}));

      // If reCAPTCHA evaluation failed, retry with new token (unless using static token)
      if (isRecaptchaEvaluationFailed(response.status, errorData)) {
        if (usingStaticToken) {
          this.logger.error(
            "[Image] reCAPTCHA evaluation failed with static token - not retrying"
          );
          throw parseGoogleApiError(errorData, response.status);
        }
        this.logger.warn(
          `[Image] reCAPTCHA evaluation failed (attempt ${attempt}/${maxEvalRetries}), retrying with new token...`
        );
        continue;
      }

      // Other error - throw immediately
      this.logger.error(
        "[Image] API error:",
        JSON.stringify(errorData, null, 2)
      );
      throw parseGoogleApiError(errorData, response.status);
    }

    throw new GLabsError(
      `Image generation failed after ${maxEvalRetries} reCAPTCHA attempts`,
      "RECAPTCHA_EVAL_FAILED"
    );
  }

  /**
   * Parse image generation response
   */
  private parseImageResponse(
    rawData: unknown,
    prompt: string,
    sessionId: string
  ): GenerateImageResult {
    const data = rawData as Record<string, unknown>;
    const mediaArray = Array.isArray(rawData)
      ? rawData
      : ((data?.media as unknown[]) ??
        (data?.result as Record<string, unknown>)?.media ??
        []);

    if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
      throw new GLabsError("No media in response", "PARSE_ERROR");
    }

    const normalizedImages: GeneratedImage[] = [];

    for (const entry of mediaArray) {
      const image = this.parseMediaEntry(entry, prompt);
      if (image) {
        normalizedImages.push(image);
      }
    }

    if (normalizedImages.length === 0) {
      throw new GLabsError("No valid images in response", "PARSE_ERROR");
    }

    return {
      images: normalizedImages,
      sessionId: sessionId.trim(),
    };
  }

  /**
   * Parse a single media entry from response
   */
  private parseMediaEntry(
    entry: unknown,
    defaultPrompt: string
  ): GeneratedImage | null {
    const e = entry as Record<string, unknown>;
    const generatedImage =
      (e?.generatedImage as Record<string, unknown>) ??
      ((e?.image as Record<string, unknown>)?.generatedImage as Record<
        string,
        unknown
      >) ??
      (e?.image as Record<string, unknown>);

    if (!generatedImage) {
      return null;
    }

    const encodedImage =
      (generatedImage.encodedImage as string | undefined) ??
      (generatedImage.base64Image as string | undefined) ??
      (generatedImage.imageBase64 as string | undefined);

    const fifeUrl = generatedImage.fifeUrl as string | undefined;

    if (!(fifeUrl || encodedImage)) {
      return null;
    }

    const mimeType = (generatedImage.mimeType as string) ?? "image/png";
    const workflowId =
      (e.workflowId as string | undefined) ??
      (generatedImage.workflowId as string | undefined);
    const mediaId =
      (e.mediaId as string | undefined) ??
      (e.name as string | undefined) ??
      (generatedImage.mediaId as string | undefined) ??
      (generatedImage.mediaGenerationId as string | undefined) ??
      workflowId;

    return {
      encodedImage,
      mediaId,
      mediaGenerationId: generatedImage.mediaGenerationId as string | undefined,
      workflowId,
      prompt: (generatedImage.prompt as string) ?? defaultPrompt,
      seed: generatedImage.seed as number | undefined,
      mimeType,
      fifeUrl,
    };
  }

  /**
   * Convert aspect ratio string to API enum
   */
  private getImageAspectRatioEnum(aspectRatio?: string): string {
    if (aspectRatio === "9:16") {
      return "IMAGE_ASPECT_RATIO_PORTRAIT";
    }
    if (aspectRatio === "1:1") {
      return "IMAGE_ASPECT_RATIO_SQUARE";
    }
    return "IMAGE_ASPECT_RATIO_LANDSCAPE";
  }
}
