/**
 * Vertex AI Video Generation Service
 *
 * Handles video generation via Google Vertex AI Veo models.
 * Supports text-to-video and image-to-video (start + optional end frame).
 */

import { ENDPOINTS } from "../constants";
import type { GLabsLogger, ResolvedConfig } from "../types/client";
import type { AspectRatio } from "../types/common";
import type { VideoOperationResult, VideoStatusResult } from "../types/video";
import { fetchWithRetry, GLabsError } from "../utils";

const DEFAULT_VIDEO_MODEL = "veo-3.0-generate-preview";
const DEFAULT_DURATION_SECONDS = 8;
const DEFAULT_SAMPLE_COUNT = 1;

/** Image input for Vertex AI video generation */
export type VertexVideoImageInput = {
  /** Base64-encoded image bytes */
  bytesBase64Encoded?: string;
  /** GCS URI (alternative to base64) */
  gcsUri?: string;
  /** MIME type of the image (default: "image/jpeg") */
  mimeType?: string;
};

/** Options for Vertex AI text-to-video */
export type VertexTextToVideoOptions = {
  prompt: string;
  aspectRatio?: AspectRatio;
  sampleCount?: number;
  durationSeconds?: number;
};

/** Options for Vertex AI image-to-video */
export type VertexImageToVideoOptions = {
  prompt: string;
  /** Start/first frame image */
  image: VertexVideoImageInput;
  /** End/last frame image (optional) */
  lastFrame?: VertexVideoImageInput;
  aspectRatio?: AspectRatio;
  sampleCount?: number;
  durationSeconds?: number;
};

/** Options for polling a Vertex AI operation */
export type VertexPollOptions = {
  operationName: string;
  maxAttempts?: number;
  intervalMs?: number;
  onProgress?: (status: VideoStatusResult, attempt: number) => void;
};

/** Options for creating a Vertex AI video service instance */
export type VertexVideoServiceOptions = {
  /** Resolved client configuration */
  config: ResolvedConfig;
};

/** Vertex AI video generation service */
export class VertexVideoService {
  private readonly config: ResolvedConfig;
  private readonly logger: GLabsLogger;

  constructor(options: VertexVideoServiceOptions) {
    this.config = options.config;
    this.logger = options.config.logger;
  }

  /** Get Vertex AI config or throw */
  private getVertexConfig() {
    const vertexConfig = this.config.vertexAI;
    if (!vertexConfig) {
      throw new GLabsError(
        "Vertex AI configuration required",
        "VERTEX_CONFIG_MISSING"
      );
    }
    return vertexConfig;
  }

  /** Build image instance object for Vertex AI payload */
  private buildImageInstance(input: VertexVideoImageInput): Record<string, string> {
    if (input.gcsUri) {
      return { gcsUri: input.gcsUri };
    }
    return {
      bytesBase64Encoded: input.bytesBase64Encoded ?? "",
      mimeType: input.mimeType ?? "image/jpeg",
    };
  }

  /**
   * Generate video from text prompt via Vertex AI
   */
  async generateTextToVideo(
    options: VertexTextToVideoOptions
  ): Promise<VideoOperationResult> {
    const vertexConfig = this.getVertexConfig();
    const location = vertexConfig.location ?? "us-central1";
    const modelId = vertexConfig.videoModelId ?? DEFAULT_VIDEO_MODEL;

    const payload = {
      instances: [{ prompt: options.prompt }],
      parameters: {
        aspectRatio: options.aspectRatio ?? "16:9",
        sampleCount: options.sampleCount ?? DEFAULT_SAMPLE_COUNT,
        durationSeconds: options.durationSeconds ?? DEFAULT_DURATION_SECONDS,
      },
    };

    const url = ENDPOINTS.VERTEX_VIDEO_GENERATE(
      vertexConfig.projectId,
      location,
      modelId
    );
    this.logger.log(
      `[VertexVideo] T2V with ${modelId}, aspect ${options.aspectRatio ?? "16:9"}...`
    );

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vertexConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      timeout: this.config.timeout,
      logger: this.logger,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      this.logger.error(
        "[VertexVideo] API error:",
        JSON.stringify(errorData, null, 2)
      );
      throw new GLabsError(
        `Vertex AI video error: ${response.status} ${response.statusText}`,
        "VERTEX_API_ERROR",
        response.status
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return this.parseOperationResult(data);
  }

  /**
   * Generate video from image(s) via Vertex AI
   */
  async generateImageToVideo(
    options: VertexImageToVideoOptions
  ): Promise<VideoOperationResult> {
    const vertexConfig = this.getVertexConfig();
    const location = vertexConfig.location ?? "us-central1";
    const modelId = vertexConfig.videoModelId ?? DEFAULT_VIDEO_MODEL;

    const instance: Record<string, unknown> = {
      prompt: options.prompt,
      image: this.buildImageInstance(options.image),
    };

    if (options.lastFrame) {
      instance.lastFrame = this.buildImageInstance(options.lastFrame);
    }

    const payload = {
      instances: [instance],
      parameters: {
        aspectRatio: options.aspectRatio ?? "16:9",
        sampleCount: options.sampleCount ?? DEFAULT_SAMPLE_COUNT,
        durationSeconds: options.durationSeconds ?? DEFAULT_DURATION_SECONDS,
      },
    };

    const url = ENDPOINTS.VERTEX_VIDEO_GENERATE(
      vertexConfig.projectId,
      location,
      modelId
    );
    this.logger.log(
      `[VertexVideo] I2V with ${modelId}, aspect ${options.aspectRatio ?? "16:9"}...`
    );

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vertexConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      timeout: this.config.timeout,
      logger: this.logger,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      this.logger.error(
        "[VertexVideo] API error:",
        JSON.stringify(errorData, null, 2)
      );
      throw new GLabsError(
        `Vertex AI video error: ${response.status} ${response.statusText}`,
        "VERTEX_API_ERROR",
        response.status
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return this.parseOperationResult(data);
  }

  /**
   * Poll a Vertex AI long-running operation until done, failed, or timeout
   */
  async pollOperation(options: VertexPollOptions): Promise<VideoStatusResult> {
    const {
      operationName,
      maxAttempts = 60,
      intervalMs = 10_000,
      onProgress,
    } = options;

    const vertexConfig = this.getVertexConfig();
    const location = vertexConfig.location ?? "us-central1";

    const modelId = vertexConfig.videoModelId ?? DEFAULT_VIDEO_MODEL;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const url = ENDPOINTS.VERTEX_FETCH_PREDICT_OPERATION(
        vertexConfig.projectId,
        location,
        modelId
      );

      const response = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vertexConfig.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operationName }),
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        timeout: this.config.timeout,
        logger: this.logger,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GLabsError(
          `Vertex AI poll error: ${response.status} ${JSON.stringify(errorData)}`,
          "VERTEX_API_ERROR",
          response.status
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const result = this.parseStatusResult(data, operationName);

      if (onProgress) {
        onProgress(result, attempt);
      }

      // Done successfully
      if (data.done === true && !result.error) {
        return result;
      }

      // Failed
      if (result.error) {
        throw new GLabsError(
          result.error,
          "VIDEO_GENERATION_FAILED"
        );
      }

      // Still running — wait
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new GLabsError(
      `Vertex AI video poll timed out after ${maxAttempts} attempts (${(maxAttempts * intervalMs) / 1000}s)`,
      "VIDEO_POLL_TIMEOUT"
    );
  }

  /** Parse the long-running operation initiation response */
  private parseOperationResult(
    data: Record<string, unknown>
  ): VideoOperationResult {
    const name = (data.name as string) ?? "";
    if (!name) {
      this.logger.error(
        "[VertexVideo] Warning: operation name empty! Response:",
        JSON.stringify(data, null, 2)
      );
    }

    return {
      operationName: name,
      sceneId: "",
      status: data.done === true
        ? "MEDIA_GENERATION_STATUS_COMPLETED"
        : "MEDIA_GENERATION_STATUS_PENDING",
    };
  }

  /** Parse the poll response into VideoStatusResult */
  private parseStatusResult(
    data: Record<string, unknown>,
    operationName: string
  ): VideoStatusResult {
    const done = data.done === true;
    const error = data.error as Record<string, unknown> | undefined;
    const responseObj = data.response as Record<string, unknown> | undefined;

    if (error) {
      return {
        status: "MEDIA_GENERATION_STATUS_FAILED",
        error: (error.message as string) ?? JSON.stringify(error),
      };
    }

    if (done && responseObj) {
      const videos = responseObj.videos as Array<Record<string, unknown>> | undefined;
      const firstVideo = videos?.[0];

      return {
        status: "MEDIA_GENERATION_STATUS_COMPLETED",
        videoBase64: (firstVideo?.bytesBase64Encoded as string) ?? "",
        mediaGenerationId: operationName,
      };
    }

    // Still in progress
    const metadata = data.metadata as Record<string, unknown> | undefined;
    return {
      status: "MEDIA_GENERATION_STATUS_PENDING",
      mediaGenerationId: (metadata?.operationId as string) ?? operationName,
    };
  }
}
