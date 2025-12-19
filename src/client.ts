/**
 * GLabs Client
 *
 * Main entry point for the Google Labs AI SDK.
 *
 * @example
 * ```typescript
 * import { GLabsClient } from '@vrex/glabs-sdk';
 *
 * const client = new GLabsClient({
 *   bearerToken: 'your-token',
 *   accountTier: 'pro',
 *   recaptcha: {
 *     provider: 'yescaptcha',
 *     apiKey: 'your-api-key',
 *   },
 * });
 *
 * // Generate an image
 * const result = await client.images.generate({
 *   prompt: 'A beautiful sunset over mountains',
 *   projectId: 'project-id',
 *   sessionId: 'session-id',
 *   aspectRatio: '16:9',
 * });
 *
 * // Generate a video
 * const operation = await client.videos.generateTextToVideo({
 *   prompt: 'A cinematic drone shot of a city',
 *   projectId: 'project-id',
 *   sessionId: 'session-id',
 *   aspectRatio: '16:9',
 *   accountTier: 'pro',
 * });
 *
 * // Check video status
 * const status = await client.videos.checkStatus({
 *   operationName: operation.operationName,
 * });
 * ```
 */

import { DEFAULTS } from "./constants";
import { ImageService, RecaptchaService, VideoService } from "./services";
import type {
  GLabsClientConfig,
  GLabsLogger,
  ResolvedConfig,
} from "./types/client";
import type { AccountTier, AspectRatio } from "./types/common";
import type {
  CreditStatusResult,
  GenerateImageOptions,
  GenerateImageResult,
  UploadImageOptions,
  UploadImageResult,
} from "./types/image";
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
} from "./types/video";
import { generateId } from "./utils";

/** Default logger using console */
const defaultLogger: GLabsLogger = {
  log: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

/**
 * Google Labs AI SDK Client
 *
 * Provides a unified interface for image and video generation using Google Labs APIs.
 */
export class GLabsClient {
  private readonly config: ResolvedConfig;
  private readonly recaptchaService: RecaptchaService;
  private readonly imageService: ImageService;
  private readonly videoService: VideoService;

  /**
   * Create a new GLabs client
   */
  constructor(config: GLabsClientConfig) {
    this.config = this.resolveConfig(config);
    this.recaptchaService = new RecaptchaService({
      logger: this.config.logger,
    });
    this.imageService = new ImageService({
      config: this.config,
      recaptchaService: this.recaptchaService,
    });
    this.videoService = new VideoService({
      config: this.config,
      recaptchaService: this.recaptchaService,
    });
  }

  /**
   * Resolve configuration with defaults
   */
  private resolveConfig(config: GLabsClientConfig): ResolvedConfig {
    return {
      bearerToken: config.bearerToken,
      accountTier: config.accountTier ?? "pro",
      projectId: config.projectId,
      recaptcha: config.recaptcha,
      logger: config.logger ?? defaultLogger,
      timeout: config.timeout ?? DEFAULTS.TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULTS.MAX_RETRIES,
      retryDelay: config.retryDelay ?? DEFAULTS.RETRY_DELAY,
    };
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return generateId();
  }

  /**
   * Get the configured account tier
   */
  get accountTier(): AccountTier {
    return this.config.accountTier;
  }

  /**
   * Get the configured project ID
   */
  get projectId(): string | undefined {
    return this.config.projectId;
  }

  // =========================================================================
  // Image API
  // =========================================================================

  /**
   * Image generation APIs
   */
  readonly images = {
    /**
     * Get video credit status for the account
     */
    getCreditStatus: (): Promise<CreditStatusResult> =>
      this.imageService.getCreditStatus(),

    /**
     * Upload an image to Google Labs
     */
    upload: (options: UploadImageOptions): Promise<UploadImageResult> =>
      this.imageService.uploadImage(options),

    /**
     * Generate images from a prompt
     */
    generate: (
      options: Omit<GenerateImageOptions, "projectId"> & { projectId?: string }
    ): Promise<GenerateImageResult> => {
      const projectId = options.projectId ?? this.config.projectId;
      if (!projectId) {
        throw new Error(
          "projectId is required. Either pass it in options or configure it in the client."
        );
      }
      return this.imageService.generateImage({
        ...options,
        projectId,
      });
    },
  };

  // =========================================================================
  // Video API
  // =========================================================================

  /**
   * Video generation APIs
   */
  readonly videos = {
    /**
     * Generate video from text prompt
     */
    generateTextToVideo: (
      options: Omit<GenerateTextToVideoOptions, "projectId" | "accountTier"> & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = options.projectId ?? this.config.projectId;
      if (!projectId) {
        throw new Error(
          "projectId is required. Either pass it in options or configure it in the client."
        );
      }
      return this.videoService.generateTextToVideo({
        ...options,
        projectId,
        accountTier: options.accountTier ?? this.config.accountTier,
      });
    },

    /**
     * Generate video from image (first frame or first+last frame)
     */
    generateImageToVideo: (
      options: Omit<
        GenerateImageToVideoOptions,
        "projectId" | "accountTier"
      > & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = options.projectId ?? this.config.projectId;
      if (!projectId) {
        throw new Error(
          "projectId is required. Either pass it in options or configure it in the client."
        );
      }
      return this.videoService.generateImageToVideo({
        ...options,
        projectId,
        accountTier: options.accountTier ?? this.config.accountTier,
      });
    },

    /**
     * Extend an existing video
     */
    extend: (
      options: Omit<ExtendVideoOptions, "projectId" | "accountTier"> & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = options.projectId ?? this.config.projectId;
      if (!projectId) {
        throw new Error(
          "projectId is required. Either pass it in options or configure it in the client."
        );
      }
      return this.videoService.extendVideo({
        ...options,
        projectId,
        accountTier: options.accountTier ?? this.config.accountTier,
      });
    },

    /**
     * Apply camera control reshoot to a video
     */
    reshoot: (
      options: Omit<ReshootVideoOptions, "projectId" | "accountTier"> & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = options.projectId ?? this.config.projectId;
      if (!projectId) {
        throw new Error(
          "projectId is required. Either pass it in options or configure it in the client."
        );
      }
      return this.videoService.reshootVideo({
        ...options,
        projectId,
        accountTier: options.accountTier ?? this.config.accountTier,
      });
    },

    /**
     * Upscale a video to HD (1080p)
     */
    upsample: (
      options: Omit<UpsampleVideoOptions, "aspectRatio"> & {
        aspectRatio?: AspectRatio;
      }
    ): Promise<VideoOperationResult> =>
      this.videoService.upsampleVideo({
        ...options,
        aspectRatio: options.aspectRatio ?? "16:9",
      }),

    /**
     * Generate video from reference images (1-3 images)
     */
    generateReferenceImagesVideo: (
      options: Omit<
        GenerateReferenceImagesVideoOptions,
        "projectId" | "accountTier"
      > & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = options.projectId ?? this.config.projectId;
      if (!projectId) {
        throw new Error(
          "projectId is required. Either pass it in options or configure it in the client."
        );
      }
      return this.videoService.generateReferenceImagesVideo({
        ...options,
        projectId,
        accountTier: options.accountTier ?? this.config.accountTier,
      });
    },

    /**
     * Check video generation status
     */
    checkStatus: (
      options: CheckVideoStatusOptions
    ): Promise<VideoStatusResult> => this.videoService.checkStatus(options),
  };
}
