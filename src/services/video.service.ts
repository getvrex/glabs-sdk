/**
 * Video Generation Service
 *
 * Handles video generation, status checking, and various video operations.
 */

import { getVideoApiConfig } from "../config/tier-config";
import { DEFAULTS, ENDPOINTS } from "../constants";
import type { GLabsLogger, ResolvedConfig } from "../types/client";
import type { RecaptchaTokenResult } from "../types/recaptcha";
import type {
  CheckVideoStatusOptions,
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
  private async getRecaptchaToken() {
    if (!this.config.recaptcha) {
      throw new GLabsError(
        "reCAPTCHA configuration is required for video generation",
        "RECAPTCHA_REQUIRED"
      );
    }
    return await this.recaptchaService.getToken(this.config.recaptcha);
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
    const maxEvalRetries = DEFAULTS.RECAPTCHA_EVAL_MAX_RETRIES;

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

      // If reCAPTCHA evaluation failed, retry with new token
      if (isRecaptchaEvaluationFailed(response.status, errorData)) {
        this.logger.warn(
          `[Video] ${operationName}: reCAPTCHA evaluation failed (attempt ${attempt}/${maxEvalRetries}), retrying with new token...`
        );
        continue;
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
            recaptchaToken: recaptchaResult.token,
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          requests: [
            {
              aspectRatio: config.aspectRatioEnum,
              seed: requestSeed,
              textInput: { prompt: prompt.trim() },
              videoModelKey: config.videoModelKey,
              metadata: { sceneId: generatedSceneId },
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
      seed,
      sceneId,
    } = options;

    const hasEndImage = Boolean(endMediaId?.trim());
    const generationType = hasEndImage ? "image-to-video-fl" : "image-to-video";

    const config = getVideoApiConfig(
      generationType,
      accountTier,
      aspectRatio,
      videoMode
    );

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = sceneId?.trim() || generateId();

    const endpoint = hasEndImage
      ? ENDPOINTS.IMAGE_TO_VIDEO_START_END
      : ENDPOINTS.IMAGE_TO_VIDEO_START;

    return this.executeWithRecaptchaRetry(
      "Image-to-video",
      async (recaptchaResult) => {
        const requestObject: Record<string, unknown> = {
          aspectRatio: config.aspectRatioEnum,
          seed: requestSeed,
          textInput: { prompt: prompt.trim() },
          videoModelKey: config.videoModelKey,
          startImage: { mediaId: startMediaId.trim() },
          metadata: { sceneId: generatedSceneId },
        };

        if (hasEndImage && endMediaId) {
          requestObject.endImage = { mediaId: endMediaId.trim() };
        }

        const payload = {
          clientContext: {
            recaptchaToken: recaptchaResult.token,
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
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
      startFrameIndex,
      endFrameIndex,
      seed,
      sceneId,
    } = options;

    const config = getVideoApiConfig(
      "extend",
      accountTier,
      aspectRatio,
      videoMode
    );

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = sceneId?.trim() || generateId();

    const finalStartFrameIndex =
      startFrameIndex ?? DEFAULTS.VIDEO_EXTEND_START_FRAME;
    const finalEndFrameIndex = endFrameIndex ?? DEFAULTS.VIDEO_EXTEND_END_FRAME;

    return this.executeWithRecaptchaRetry(
      "Extend video",
      async (recaptchaResult) => {
        const payload = {
          clientContext: {
            recaptchaToken: recaptchaResult.token,
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          requests: [
            {
              textInput: { prompt: prompt.trim() },
              videoInput: {
                mediaId: mediaId.trim(),
                startFrameIndex: finalStartFrameIndex,
                endFrameIndex: finalEndFrameIndex,
              },
              videoModelKey: config.videoModelKey,
              aspectRatio: config.aspectRatioEnum,
              seed: requestSeed,
              metadata: { sceneId: generatedSceneId },
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
      sceneId,
    } = options;

    const config = getVideoApiConfig("reshoot", accountTier, aspectRatio);

    const requestSeed = seed ?? generateSeed();
    const generatedSceneId = sceneId?.trim() || generateId();

    return this.executeWithRecaptchaRetry(
      "Camera control",
      async (recaptchaResult) => {
        const payload = {
          clientContext: {
            recaptchaToken: recaptchaResult.token,
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          requests: [
            {
              seed: requestSeed,
              aspectRatio: config.aspectRatioEnum,
              videoInput: { mediaId: mediaId.trim() },
              reshootMotionType,
              videoModelKey: config.videoModelKey,
              metadata: { sceneId: generatedSceneId },
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
   * Upscale a video to HD (1080p)
   */
  async upsampleVideo(
    options: UpsampleVideoOptions
  ): Promise<VideoOperationResult> {
    const { originalMediaId, sessionId, aspectRatio, seed, sceneId } = options;

    const videoAspectRatio = this.getVideoAspectRatioEnum(aspectRatio);

    const finalSceneId = sceneId?.trim() || generateId();
    const finalSeed = seed ?? generateSeed();

    return this.executeWithRecaptchaRetry(
      "Upscale",
      async (recaptchaResult) => {
        const payload = {
          requests: [
            {
              aspectRatio: videoAspectRatio,
              seed: finalSeed,
              videoInput: { mediaId: originalMediaId },
              videoModelKey: "veo_2_1080p_upsampler_8s",
              metadata: { sceneId: finalSceneId },
            },
          ],
          clientContext: {
            recaptchaToken: recaptchaResult.token,
            sessionId,
          },
        };

        const headers = this.buildHeaders(recaptchaResult);
        if (!recaptchaResult.userAgent) {
          headers["User-Agent"] =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
        }
        headers.Accept = "*/*";
        headers["Accept-Language"] = "en-US,en;q=0.9";

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
            recaptchaToken: recaptchaResult.token,
            sessionId: sessionId.trim(),
            projectId: projectId.trim(),
            tool: "PINHOLE",
            userPaygateTier: config.userPaygateTier,
          },
          requests: [
            {
              aspectRatio: config.aspectRatioEnum,
              metadata: { sceneId: generatedSceneId },
              referenceImages,
              seed: requestSeed,
              textInput: { prompt: prompt.trim() },
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
   */
  async checkStatus(
    options: CheckVideoStatusOptions
  ): Promise<VideoStatusResult> {
    const { operationName, sceneId } = options;

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

    return {
      operationName,
      sceneId: (operation.sceneId as string) ?? defaultSceneId,
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
    return "VIDEO_ASPECT_RATIO_SQUARE";
  }
}
