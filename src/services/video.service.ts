/**
 * Video Generation Service
 *
 * Handles video generation, status checking, and various video operations.
 */

import { getVideoApiConfig } from "../config/tier-config";
import { DEFAULTS, ENDPOINTS, RECAPTCHA_CONFIG } from "../constants";
import type { GLabsLogger, ResolvedConfig } from "../types/client";
import type { RecaptchaTokenResult } from "../types/recaptcha";
import type {
  CheckVideoStatusOptions,
  PollOperationOptions,
  ExtendVideoOptions,
  GenerateImageToVideoOptions,
  GenerateReferenceImagesVideoOptions,
  GenerateTextToVideoOptions,
  ReshootVideoOptions,
  UpsampleVideoOptions,
  VideoOperationResult,
  VideoStatusResult,
} from "../types/video";
import {
  buildHeadersWithFingerprint,
  GLabsError,
  generateId,
  generateSeed,
  isRecaptchaEvaluationFailed,
  parseGoogleApiError,
  parseVideoOperationError,
} from "../utils";
import type { RecaptchaService } from "./recaptcha.service";

/** Result from executeWithRecaptchaRetry callback */
type VideoApiCallResult = {
  response: Response;
  sceneId: string;
};

/** Options for creating a video service instance */
export type VideoServiceOptions = {
  /** Resolved client configuration */
  config: ResolvedConfig;
  /** reCAPTCHA service instance */
  recaptchaService: RecaptchaService;
};

/** Video generation service */
export class VideoService {
  private readonly config: ResolvedConfig;
  private readonly recaptchaService: RecaptchaService;
  private readonly logger: GLabsLogger;

  constructor(options: VideoServiceOptions) {
    this.config = options.config;
    this.recaptchaService = options.recaptchaService;
    this.logger = options.config.logger;
  }

  /**
   * Get reCAPTCHA token (required for all video operations)
   */
  private async getRecaptchaToken(pageAction?: string) {
    if (!this.config.recaptcha) {
      throw new GLabsError(
        "reCAPTCHA configuration is required for video generation",
        "RECAPTCHA_REQUIRED"
      );
    }
    return await this.recaptchaService.getToken({
      ...this.config.recaptcha,
      pageAction: pageAction ?? RECAPTCHA_CONFIG.PAGE_ACTION_VIDEO,
    });
  }

  /**
   * Build common headers with bearer token and fingerprint
   */
  private buildHeaders(fingerprint?: { userAgent?: string; secChUa?: string }) {
    const headers = buildHeadersWithFingerprint(
      this.config.bearerToken,
      fingerprint
    );
    headers["Content-Type"] = "text/plain;charset=UTF-8";
    return headers;
  }

  /**
   * Execute a video API call with reCAPTCHA retry logic
   */
  private async executeWithRecaptchaRetry(
    operationName: string,
    apiCall: (
      recaptchaResult: RecaptchaTokenResult
    ) => Promise<VideoApiCallResult>
  ): Promise<VideoOperationResult> {
    // Don't retry if using static token - it won't change between attempts
    const usingStaticToken = Boolean(this.config.recaptcha?.staticToken);
    const maxEvalRetries = usingStaticToken
      ? 1
      : DEFAULTS.RECAPTCHA_EVAL_MAX_RETRIES;

    for (let attempt = 1; attempt <= maxEvalRetries; attempt++) {
      this.logger.log(
        `[Video] ${operationName}: Fetching reCAPTCHA token (attempt ${attempt}/${maxEvalRetries})...`
      );
      const recaptchaResult = await this.getRecaptchaToken();
      this.logger.log("[Video] reCAPTCHA token obtained");

      const { response, sceneId } = await apiCall(recaptchaResult);

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        return this.parseOperationResult(data, sceneId);
      }

      const errorData = await response.json().catch(() => ({}));

      // If reCAPTCHA evaluation failed, retry with new token (unless using static token)
      if (isRecaptchaEvaluationFailed(response.status, errorData)) {
        if (usingStaticToken) {
          this.logger.error(
            `[Video] ${operationName}: reCAPTCHA evaluation failed with static token - not retrying`
          );
          throw parseGoogleApiError(errorData, response.status);
        }

        if (attempt < maxEvalRetries) {
          this.logger.warn(
            `[Video] ${operationName}: reCAPTCHA evaluation failed (attempt ${attempt}/${maxEvalRetries}), retrying with new token...`
          );
          continue;
        }

        this.logger.error(
          `[Video] ${operationName}: reCAPTCHA evaluation failed after ${maxEvalRetries} attempts; giving up`
        );
        throw parseGoogleApiError(errorData, response.status);
      }

      // Other error - throw immediately
      this.logger.error(`[Video] ${operationName} failed:`, errorData);
      throw parseGoogleApiError(errorData, response.status);
    }

    throw new GLabsError(
      `${operationName} failed after ${maxEvalRetries} reCAPTCHA attempts`,
      "RECAPTCHA_EVAL_FAILED"
    );
  }

  /**
   * Generate video from text prompt
   */
  async generateTextToVideo(
    options: GenerateTextToVideoOptions
  ): Promise<VideoOperationResult> {
    const {
      prompt,
      sessionId,
      projectId,
      aspectRatio,
      accountTier,
      videoMode,
      seed,
      sceneId,
    } = options;

    const config = getVideoApiConfig(
      "text-to-video",
      accountTier,
      aspectRatio,
      videoMode
    );

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = sceneId?.trim() || generateId();

    return this.executeWithRecaptchaRetry(
      "Text-to-video",
      async (recaptchaResult) => {
        const payload = {
          clientContext: {
            recaptchaContext: { token: recaptchaResult.token, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          useV2ModelConfig: true,
          mediaGenerationContext: { batchId: crypto.randomUUID() },
          requests: [
            {
              aspectRatio: config.aspectRatioEnum,
              seed: requestSeed,
              textInput: { structuredPrompt: { parts: [{ text: prompt.trim() }] } },
              videoModelKey: config.videoModelKey,
              metadata: {},
            },
          ],
        };

        const headers = this.buildHeaders(recaptchaResult);

        const response = await fetch(ENDPOINTS.TEXT_TO_VIDEO, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        return { response, sceneId: generatedSceneId };
      }
    );
  }

  /**
   * Generate video from image (first frame or first+last frame)
   */
  async generateImageToVideo(
    options: GenerateImageToVideoOptions
  ): Promise<VideoOperationResult> {
    const {
      prompt,
      sessionId,
      projectId,
      aspectRatio,
      accountTier,
      videoMode,
      startMediaId,
      endMediaId,
      cropCoordinates,
      seed,
      sceneId,
    } = options;

    const hasEndImage = Boolean(endMediaId?.trim());
    const generationType = hasEndImage ? "image-to-video-fl" : "image-to-video";

    // Flow I2V currently rejects square aspect ratio for this endpoint.
    // Normalize 1:1 requests to landscape to avoid INVALID_ARGUMENT errors.
    const normalizedAspectRatio = aspectRatio === "1:1" ? "16:9" : aspectRatio;
    if (aspectRatio === "1:1") {
      this.logger.warn(
        "[Video] Image-to-video: aspectRatio 1:1 is not supported by Flow endpoint; falling back to 16:9"
      );
    }

    const baseConfig = getVideoApiConfig(
      generationType,
      accountTier,
      normalizedAspectRatio,
      videoMode
    );

    // Default I2V portrait ultra to fast-ultra portrait model
    // unless caller explicitly sets a different videoMode.
    const config =
      generationType === "image-to-video" &&
      accountTier === "ultra" &&
      normalizedAspectRatio === "9:16" &&
      !videoMode
        ? {
            ...baseConfig,
            videoModelKey: "veo_3_1_i2v_s_fast_portrait_ultra" as const,
          }
        : baseConfig;

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = sceneId?.trim() || generateId();

    const endpoint = hasEndImage
      ? ENDPOINTS.IMAGE_TO_VIDEO_START_END
      : ENDPOINTS.IMAGE_TO_VIDEO_START;

    return this.executeWithRecaptchaRetry(
      "Image-to-video",
      async (recaptchaResult) => {
        const startImage: Record<string, unknown> = { mediaId: startMediaId.trim() };
        if (cropCoordinates) {
          startImage.cropCoordinates = cropCoordinates;
        }

        const requestObject: Record<string, unknown> = {
          aspectRatio: config.aspectRatioEnum,
          seed: requestSeed,
          textInput: { structuredPrompt: { parts: [{ text: prompt.trim() }] } },
          videoModelKey: config.videoModelKey,
          startImage,
          metadata: {},
        };

        if (hasEndImage && endMediaId) {
          requestObject.endImage = { mediaId: endMediaId.trim() };
        }

        const payload = {
          clientContext: {
            recaptchaContext: { token: recaptchaResult.token, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          useV2ModelConfig: true,
          mediaGenerationContext: { batchId: crypto.randomUUID() },
          requests: [requestObject],
        };

        const headers = this.buildHeaders(recaptchaResult);

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        return { response, sceneId: generatedSceneId };
      }
    );
  }

  /**
   * Extend an existing video
   */
  async extendVideo(
    options: ExtendVideoOptions
  ): Promise<VideoOperationResult> {
    const {
      mediaId,
      prompt,
      sessionId,
      projectId,
      aspectRatio,
      accountTier,
      videoMode,
      seed,
      workflowId,
    } = options;

    const config = getVideoApiConfig(
      "extend",
      accountTier,
      aspectRatio,
      videoMode
    );

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = options.sceneId?.trim() || generateId();

    return this.executeWithRecaptchaRetry(
      "Extend video",
      async (recaptchaResult) => {
        const payload = {
          clientContext: {
            recaptchaContext: { token: recaptchaResult.token, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          useV2ModelConfig: true,
          mediaGenerationContext: { batchId: crypto.randomUUID() },
          requests: [
            {
              textInput: { structuredPrompt: { parts: [{ text: prompt.trim() }] } },
              videoInput: {
                mediaId: mediaId.trim(),
              },
              videoModelKey: config.videoModelKey,
              aspectRatio: config.aspectRatioEnum,
              seed: requestSeed,
              metadata: workflowId ? { workflowId } : {},
            },
          ],
        };

        const headers = this.buildHeaders(recaptchaResult);

        const response = await fetch(ENDPOINTS.EXTEND_VIDEO, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        return { response, sceneId: generatedSceneId };
      }
    );
  }

  /**
   * Apply camera control reshoot to a video
   */
  async reshootVideo(
    options: ReshootVideoOptions
  ): Promise<VideoOperationResult> {
    const {
      mediaId,
      reshootMotionType,
      sessionId,
      projectId,
      aspectRatio,
      accountTier,
      seed,
      workflowId,
    } = options;

    const config = getVideoApiConfig("reshoot", accountTier, aspectRatio);

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = options.sceneId?.trim() || generateId();

    return this.executeWithRecaptchaRetry(
      "Camera control",
      async (recaptchaResult) => {
        const payload = {
          clientContext: {
            recaptchaContext: { token: recaptchaResult.token, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          useV2ModelConfig: true,
          mediaGenerationContext: { batchId: crypto.randomUUID() },
          requests: [
            {
              seed: requestSeed,
              aspectRatio: config.aspectRatioEnum,
              videoInput: { mediaId: mediaId.trim() },
              textInput: { structuredPrompt: { parts: [] } },
              reshootMotionType,
              videoModelKey: config.videoModelKey,
              metadata: workflowId ? { workflowId } : {},
            },
          ],
        };

        const headers = this.buildHeaders(recaptchaResult);

        const response = await fetch(ENDPOINTS.RESHOOT_VIDEO, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        return { response, sceneId: generatedSceneId };
      }
    );
  }

  /**
   * Upscale a video to 4K
   */
  async upsampleVideo(
    options: UpsampleVideoOptions
  ): Promise<VideoOperationResult> {
    const { originalMediaId, sessionId, projectId, accountTier, aspectRatio, seed, workflowId, resolution } = options;

    const videoAspectRatio = this.getVideoAspectRatioEnum(aspectRatio);
    const config = getVideoApiConfig("upsample", accountTier, aspectRatio);

    const finalSceneId = options.sceneId?.trim() || generateId();
    const finalSeed = seed ?? generateSeed();

    return this.executeWithRecaptchaRetry(
      "Upscale",
      async (recaptchaResult) => {
        const payload = {
          clientContext: {
            recaptchaContext: { token: recaptchaResult.token, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          useV2ModelConfig: true,
          mediaGenerationContext: { batchId: crypto.randomUUID() },
          requests: [
            {
              aspectRatio: videoAspectRatio,
              seed: finalSeed,
              videoInput: { mediaId: originalMediaId },
              videoModelKey: DEFAULTS.VIDEO_UPSAMPLE_MODEL,
              resolution: resolution ?? "VIDEO_RESOLUTION_1080P",
              metadata: workflowId ? { workflowId } : {},
            },
          ],
        };

        const headers = this.buildHeaders(recaptchaResult);

        const response = await fetch(ENDPOINTS.UPSAMPLE_VIDEO, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        return { response, sceneId: finalSceneId };
      }
    );
  }

  /**
   * Generate video from reference images (1-3 images)
   */
  async generateReferenceImagesVideo(
    options: GenerateReferenceImagesVideoOptions
  ): Promise<VideoOperationResult> {
    const {
      prompt,
      referenceMediaIds,
      sessionId,
      projectId,
      aspectRatio,
      accountTier,
      seed,
      sceneId,
    } = options;

    if (!referenceMediaIds || referenceMediaIds.length === 0) {
      throw new GLabsError(
        "At least 1 reference image is required",
        "INVALID_ARGUMENT"
      );
    }
    if (referenceMediaIds.length > 3) {
      throw new GLabsError(
        "Maximum 3 reference images allowed",
        "INVALID_ARGUMENT"
      );
    }

    const config = getVideoApiConfig(
      "reference-images",
      accountTier,
      aspectRatio
    );

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = sceneId?.trim() || generateId();

    const referenceImages = referenceMediaIds
      .filter((id) => id?.trim())
      .map((mediaId) => ({
        imageUsageType: "IMAGE_USAGE_TYPE_ASSET",
        mediaId: mediaId.trim(),
      }));

    return this.executeWithRecaptchaRetry(
      "Reference images",
      async (recaptchaResult) => {
        const payload = {
          clientContext: {
            recaptchaContext: { token: recaptchaResult.token, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          useV2ModelConfig: true,
          mediaGenerationContext: { batchId: crypto.randomUUID() },
          requests: [
            {
              aspectRatio: config.aspectRatioEnum,
              metadata: {},
              referenceImages,
              seed: requestSeed,
              textInput: { structuredPrompt: { parts: [{ text: prompt.trim() }] } },
              videoModelKey: config.videoModelKey,
            },
          ],
        };

        const headers = this.buildHeaders(recaptchaResult);

        const response = await fetch(ENDPOINTS.REFERENCE_IMAGES_VIDEO, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        return { response, sceneId: generatedSceneId };
      }
    );
  }

  /**
   * Check video generation status
   *
   * Supports both new format (mediaId + projectId) and legacy format (operationName + sceneId).
   */
  async checkStatus(
    options: CheckVideoStatusOptions
  ): Promise<VideoStatusResult> {
    const { operationName, sceneId, mediaId, projectId } = options;

    // New format: use media[] payload
    if (mediaId && projectId) {
      const payload = {
        media: [{ name: mediaId, projectId }],
      };

      const headers = this.buildHeaders();

      const response = await fetch(ENDPOINTS.CHECK_VIDEO_STATUS, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw parseGoogleApiError(errorData, response.status);
      }

      const data = (await response.json()) as Record<string, unknown>;
      return this.parseMediaStatusResult(data);
    }

    // Legacy format: use operations[] payload
    if (!operationName) {
      throw new GLabsError(
        "Either mediaId+projectId or operationName is required for checkStatus",
        "INVALID_ARGUMENT"
      );
    }

    const payload = {
      operations: [
        {
          operation: { name: operationName },
          ...(sceneId ? { sceneId } : {}),
          status: "MEDIA_GENERATION_STATUS_PENDING",
        },
      ],
    };

    const headers = this.buildHeaders();

    const response = await fetch(ENDPOINTS.CHECK_VIDEO_STATUS, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw parseGoogleApiError(errorData, response.status);
    }

    const data = (await response.json()) as Record<string, unknown>;

    // Try new format first (response may contain media[])
    const mediaArray = data.media as Record<string, unknown>[] | undefined;
    if (mediaArray && mediaArray.length > 0) {
      return this.parseMediaStatusResult(data);
    }

    // Fall back to legacy operations[] parsing
    const operations = (data.operations as Record<string, unknown>[]) ?? [];

    if (operations.length === 0) {
      throw new GLabsError("No operations in response", "PARSE_ERROR");
    }

    const operation = operations[0] as Record<string, unknown>;
    const status = (operation.status as string) ?? "UNKNOWN";

    const innerOp = operation.operation as Record<string, unknown> | undefined;
    const metadata = (operation.metadata ?? innerOp?.metadata) as
      | Record<string, unknown>
      | undefined;
    const videoData = (operation.video ?? metadata?.video) as
      | Record<string, unknown>
      | undefined;

    const rawError = innerOp?.error ?? operation.error ?? metadata?.error;
    const errorMessage = rawError
      ? parseVideoOperationError(operation)
      : undefined;

    return {
      status,
      videoUrl:
        (videoData?.fifeUrl as string) ?? (videoData?.videoUrl as string) ?? "",
      thumbnailUrl:
        (videoData?.servingBaseUri as string) ??
        (videoData?.thumbnailUrl as string) ??
        "",
      duration: (videoData?.durationSeconds as number) ?? 0,
      mediaGenerationId:
        (videoData?.mediaGenerationId as string) ??
        (operation.mediaGenerationId as string),
      error: errorMessage,
      remainingCredits: data.remainingCredits as number | undefined,
    };
  }

  /**
   * Poll a video operation until completion, failure, or timeout.
   * Returns the final VideoStatusResult with videoUrl when ready.
   */
  async pollOperation(
    options: PollOperationOptions
  ): Promise<VideoStatusResult> {
    const {
      operationName,
      sceneId,
      mediaId,
      projectId,
      maxAttempts = 60,
      intervalMs = 10000,
      onProgress,
    } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.checkStatus({ operationName, sceneId, mediaId, projectId });

      if (onProgress) {
        onProgress(result, attempt);
      }

      // Completed successfully
      if (
        result.status === "MEDIA_GENERATION_STATUS_COMPLETED" ||
        result.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL" ||
        (result.videoUrl && result.videoUrl.length > 0)
      ) {
        return result;
      }

      // Failed
      if (
        result.status === "MEDIA_GENERATION_STATUS_FAILED" ||
        result.error
      ) {
        throw new GLabsError(
          result.error ?? `Video generation failed with status: ${result.status}`,
          "VIDEO_GENERATION_FAILED"
        );
      }

      // Still pending/active — wait and retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new GLabsError(
      `Video generation timed out after ${maxAttempts} attempts (${(maxAttempts * intervalMs) / 1000}s)`,
      "VIDEO_POLL_TIMEOUT"
    );
  }

  /**
   * Parse the new media[] status response format
   */
  private parseMediaStatusResult(
    data: Record<string, unknown>
  ): VideoStatusResult {
    const mediaArray = (data.media as Record<string, unknown>[]) ?? [];

    if (mediaArray.length === 0) {
      throw new GLabsError("No media in response", "PARSE_ERROR");
    }

    const media = mediaArray[0] as Record<string, unknown>;
    const mediaMetadata = media.mediaMetadata as Record<string, unknown> | undefined;
    const mediaStatus = mediaMetadata?.mediaStatus as Record<string, unknown> | undefined;
    const status = (mediaStatus?.mediaGenerationStatus as string) ?? "UNKNOWN";

    const videoObj = media.video as Record<string, unknown> | undefined;
    const generatedVideo = videoObj?.generatedVideo as Record<string, unknown> | undefined;

    const videoUrl =
      (generatedVideo?.fifeUrl as string) ??
      (generatedVideo?.videoUrl as string) ??
      "";
    const thumbnailUrl =
      (generatedVideo?.servingBaseUri as string) ??
      (generatedVideo?.thumbnailUrl as string) ??
      "";
    const duration = (generatedVideo?.durationSeconds as number) ?? 0;
    const mediaGenerationId = (generatedVideo?.mediaGenerationId as string) ?? undefined;

    const errorObj = mediaStatus?.error as Record<string, unknown> | undefined;
    const errorMessage = errorObj?.message as string | undefined;

    return {
      status,
      videoUrl,
      thumbnailUrl,
      duration,
      mediaGenerationId,
      error: errorMessage,
      remainingCredits: data.remainingCredits as number | undefined,
    };
  }

  /**
   * Parse operation result from response
   */
  private parseOperationResult(
    data: Record<string, unknown>,
    defaultSceneId: string
  ): VideoOperationResult {
    const operations = (data.operations as Record<string, unknown>[]) ?? [];

    if (operations.length === 0) {
      throw new GLabsError("No operations in response", "PARSE_ERROR");
    }

    const operation = operations[0] as Record<string, unknown>;
    const innerOp = operation.operation as Record<string, unknown> | undefined;

    const operationName = (innerOp?.name as string) ?? "";

    if (!operationName) {
      this.logger.error(
        "[Video] Warning: operationName is empty! Full response:",
        JSON.stringify(data, null, 2)
      );
    }

    // Extract mediaId from media[] array if present in response
    const mediaArray = (data.media as Record<string, unknown>[]) ?? [];
    const firstMedia = mediaArray.length > 0 ? mediaArray[0] as Record<string, unknown> : undefined;
    const mediaId = (firstMedia?.name as string) ?? undefined;

    return {
      operationName,
      sceneId: (operation.sceneId as string) ?? defaultSceneId,
      mediaId,
      status: (operation.status as string) ?? "MEDIA_GENERATION_STATUS_PENDING",
      remainingCredits: data.remainingCredits as number | undefined,
    };
  }

  /**
   * Convert aspect ratio string to API enum
   */
  private getVideoAspectRatioEnum(aspectRatio: string): string {
    if (aspectRatio === "16:9") {
      return "VIDEO_ASPECT_RATIO_LANDSCAPE";
    }
    if (aspectRatio === "9:16") {
      return "VIDEO_ASPECT_RATIO_PORTRAIT";
    }
    return "VIDEO_ASPECT_RATIO_LANDSCAPE";
  }
}
