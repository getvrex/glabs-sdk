/**
 * GLabs Client
 *
 * Main entry point for the Google Labs AI SDK.
 *
 * @example
 * ```typescript
 * import { GLabsClient } from '@getvrex/glabs-sdk';
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
import {
  ImageService,
  ProjectService,
  RecaptchaService,
  TokenManager,
  VideoService,
} from "./services";
import type {
  GLabsClientConfig,
  GLabsLogger,
  ResolvedConfig,
  TokenExtractionResult,
} from "./types/client";
import { GLabsError } from "./utils";
import type { AccountTier, AspectRatio } from "./types/common";
import type {
  CreditStatusResult,
  GenerateImageOptions,
  GenerateImageResult,
  UploadImageOptions,
  UploadImageResult,
  UpsampleImageOptions,
  UpsampleImageResult,
} from "./types/image";
import type {
  GetProjectOptions,
  GetProjectResult,
  ListProjectsOptions,
  ListProjectsResult,
} from "./types/project";
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
} from "./types/video";

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
  private readonly tokenManager: TokenManager;
  private readonly recaptchaService: RecaptchaService;
  private readonly imageService: ImageService;
  private readonly videoService: VideoService;
  private readonly projectService: ProjectService;

  /**
   * Create a new GLabs client
   */
  constructor(config: GLabsClientConfig) {
    this.config = this.resolveConfig(config);
    this.tokenManager = new TokenManager(this.config);
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
    this.projectService = new ProjectService({
      config: this.config,
    });
  }

  /**
   * Resolve configuration with defaults
   */
  private resolveConfig(config: GLabsClientConfig): ResolvedConfig {
    return {
      bearerToken: config.bearerToken,
      sessionToken: config.sessionToken,
      accountTier: config.accountTier ?? "pro",
      projectId: config.projectId,
      recaptcha: config.recaptcha,
      tokenExtractor: config.tokenExtractor,
      logger: config.logger ?? defaultLogger,
      timeout: config.timeout ?? DEFAULTS.TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULTS.MAX_RETRIES,
      retryDelay: config.retryDelay ?? DEFAULTS.RETRY_DELAY,
    };
  }

  /**
   * Generate a session ID in the format expected by Google's API: ";TIMESTAMP_MS"
   */
  static generateSessionId(): string {
    return `";${Date.now()}"`;
  }

  /**
   * Execute a function with automatic token refresh.
   * Ensures token is valid before the call, and retries once on 401.
   */
  private async withTokenRefresh<T>(fn: () => Promise<T>): Promise<T> {
    await this.tokenManager.ensureValid();
    try {
      return await fn();
    } catch (error) {
      // On 401, try refreshing once and retry
      if (
        (this.config.sessionToken || this.config.tokenExtractor) &&
        error instanceof GLabsError &&
        error.statusCode === 401
      ) {
        this.config.logger.warn(
          "[Client] Got 401, refreshing token and retrying..."
        );
        await this.tokenManager.forceRefresh();
        return await fn();
      }
      throw error;
    }
  }

  /**
   * Manually refresh the bearer token using the session token.
   * Useful when you know the token has expired.
   */
  async refreshToken(): Promise<void> {
    await this.tokenManager.forceRefresh();
  }

  /**
   * Extract fresh tokens via Browserless.
   * Requires tokenExtractor config (googleEmail, googlePassword, browserlessToken).
   */
  async extractTokens(): Promise<TokenExtractionResult> {
    return this.tokenManager.extractTokens();
  }

  /**
   * Close persistent resources (e.g. Chrome browser for reCAPTCHA).
   * Call this when you're done with the client.
   */
  async close(): Promise<void> {
    await this.recaptchaService.close();
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

  /**
   * Resolve project ID - uses provided, then config, then fetches first available
   */
  private async resolveProjectId(providedProjectId?: string): Promise<string> {
    if (providedProjectId) {
      return providedProjectId;
    }
    if (this.config.projectId) {
      return this.config.projectId;
    }
    return this.projectService.getFirstProjectId();
  }

  // =========================================================================
  // Project API
  // =========================================================================

  /**
   * Project management APIs
   */
  readonly projects = {
    /**
     * List user projects
     */
    list: (options?: ListProjectsOptions): Promise<ListProjectsResult> =>
      this.projectService.listProjects(options),

    /**
     * Get a specific project by ID
     */
    get: (options: GetProjectOptions): Promise<GetProjectResult> =>
      this.projectService.getProject(options),

    /**
     * Get the first available project ID (cached after first call)
     */
    getFirstProjectId: (): Promise<string> =>
      this.projectService.getFirstProjectId(),

    /**
     * Clear the cached first project ID
     */
    clearCache: (): void => this.projectService.clearCache(),
  };

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
      this.withTokenRefresh(() => this.imageService.getCreditStatus()),

    /**
     * Upload an image to Google Labs
     */
    upload: (options: UploadImageOptions): Promise<UploadImageResult> =>
      this.withTokenRefresh(() => this.imageService.uploadImage(options)),

    /**
     * Generate images from a prompt
     * If no projectId provided, auto-selects first available project.
     */
    generate: async (
      options: Omit<GenerateImageOptions, "projectId"> & { projectId?: string }
    ): Promise<GenerateImageResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.imageService.generateImage({ ...options, projectId })
      );
    },

    /**
     * Upsample (upscale) an image to a higher resolution
     */
    upsampleImage: async (
      options: Omit<UpsampleImageOptions, "projectId"> & { projectId?: string }
    ): Promise<UpsampleImageResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.imageService.upsampleImage({ ...options, projectId })
      );
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
     * If no projectId provided, auto-selects first available project.
     */
    generateTextToVideo: async (
      options: Omit<GenerateTextToVideoOptions, "projectId" | "accountTier"> & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.videoService.generateTextToVideo({
          ...options,
          projectId,
          accountTier: options.accountTier ?? this.config.accountTier,
        })
      );
    },

    /**
     * Generate video from image (first frame or first+last frame)
     * If no projectId provided, auto-selects first available project.
     */
    generateImageToVideo: async (
      options: Omit<
        GenerateImageToVideoOptions,
        "projectId" | "accountTier"
      > & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.videoService.generateImageToVideo({
          ...options,
          projectId,
          accountTier: options.accountTier ?? this.config.accountTier,
        })
      );
    },

    /**
     * Extend an existing video
     * If no projectId provided, auto-selects first available project
     */
    extend: async (
      options: Omit<ExtendVideoOptions, "projectId" | "accountTier"> & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.videoService.extendVideo({
          ...options,
          projectId,
          accountTier: options.accountTier ?? this.config.accountTier,
        })
      );
    },

    /**
     * Apply camera control reshoot to a video
     * If no projectId provided, auto-selects first available project
     */
    reshoot: async (
      options: Omit<ReshootVideoOptions, "projectId" | "accountTier"> & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.videoService.reshootVideo({
          ...options,
          projectId,
          accountTier: options.accountTier ?? this.config.accountTier,
        })
      );
    },

    /**
     * Upscale a video to HD (1080p)
     * If no projectId provided, auto-selects first available project
     */
    upsample: async (
      options: Omit<UpsampleVideoOptions, "projectId" | "accountTier" | "aspectRatio"> & {
        projectId?: string;
        accountTier?: AccountTier;
        aspectRatio?: AspectRatio;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.videoService.upsampleVideo({
          ...options,
          projectId,
          accountTier: options.accountTier ?? this.config.accountTier,
          aspectRatio: options.aspectRatio ?? "16:9",
        })
      );
    },

    /**
     * Generate video from reference images (1-3 images)
     * If no projectId provided, auto-selects first available project
     */
    generateReferenceImagesVideo: async (
      options: Omit<
        GenerateReferenceImagesVideoOptions,
        "projectId" | "accountTier"
      > & {
        projectId?: string;
        accountTier?: AccountTier;
      }
    ): Promise<VideoOperationResult> => {
      const projectId = await this.resolveProjectId(options.projectId);
      return this.withTokenRefresh(() =>
        this.videoService.generateReferenceImagesVideo({
          ...options,
          projectId,
          accountTier: options.accountTier ?? this.config.accountTier,
        })
      );
    },

    /**
     * Check video generation status
     */
    checkStatus: (
      options: CheckVideoStatusOptions
    ): Promise<VideoStatusResult> =>
      this.withTokenRefresh(() => this.videoService.checkStatus(options)),

    /**
     * Poll a video operation until completion, failure, or timeout
     */
    pollOperation: (
      options: PollOperationOptions
    ): Promise<VideoStatusResult> =>
      this.withTokenRefresh(() =>
        this.videoService.pollOperation(options)
      ),
  };
}
