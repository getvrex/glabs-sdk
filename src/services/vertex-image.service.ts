/**
 * Vertex AI Image Generation Service
 *
 * Handles image generation via Google Vertex AI Imagen 4 models.
 */

import { ENDPOINTS } from "../constants";
import { getVertexImageModelId } from "../config/tier-config";
import type { GLabsLogger, ResolvedConfig } from "../types/client";
import type {
  GenerateImageOptions,
  GenerateImageResult,
  GeneratedImage,
} from "../types/image";
import { fetchWithRetry, GLabsError } from "../utils";

/** Options for creating a Vertex AI image service instance */
export type VertexImageServiceOptions = {
  /** Resolved client configuration */
  config: ResolvedConfig;
};

/** Vertex AI image generation service */
export class VertexImageService {
  private readonly config: ResolvedConfig;
  private readonly logger: GLabsLogger;

  constructor(options: VertexImageServiceOptions) {
    this.config = options.config;
    this.logger = options.config.logger;
  }

  /**
   * Generate images using Vertex AI Imagen
   */
  async generateImage(
    options: GenerateImageOptions
  ): Promise<GenerateImageResult> {
    const { prompt, sessionId, aspectRatio, model, count, seed, prompts } =
      options;

    const vertexConfig = this.config.vertexAI;
    if (!vertexConfig) {
      throw new GLabsError(
        "Vertex AI configuration required",
        "VERTEX_CONFIG_MISSING"
      );
    }

    const location = vertexConfig.location ?? "us-central1";
    const modelId = getVertexImageModelId(model);
    const sampleCount = Math.max(1, Math.min(4, count ?? 1));
    const allPrompts =
      prompts && prompts.length > 0 ? prompts : [prompt];
    const allImages: GeneratedImage[] = [];

    for (const currentPrompt of allPrompts) {
      const payload = {
        instances: [{ prompt: currentPrompt }],
        parameters: {
          sampleCount,
          aspectRatio: aspectRatio ?? "16:9",
          addWatermark: false,
          ...(typeof seed === "number" ? { seed } : {}),
        },
      };

      const url = ENDPOINTS.VERTEX_IMAGE_GENERATE(
        vertexConfig.projectId,
        location,
        modelId
      );
      this.logger.log(
        `[VertexImage] Generating with ${modelId}, aspect ${aspectRatio}...`
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
          "[VertexImage] API error:",
          JSON.stringify(errorData, null, 2)
        );
        throw new GLabsError(
          `Vertex AI error: ${response.status} ${response.statusText}`,
          "VERTEX_API_ERROR",
          response.status
        );
      }

      const rawData = (await response.json()) as Record<string, unknown>;
      const predictions = rawData.predictions as
        | Array<Record<string, unknown>>
        | undefined;

      if (!predictions || predictions.length === 0) {
        throw new GLabsError("No predictions in response", "PARSE_ERROR");
      }

      for (const prediction of predictions) {
        const encodedImage = prediction.bytesBase64Encoded as
          | string
          | undefined;
        const mimeType =
          (prediction.mimeType as string | undefined) ?? "image/png";

        if (encodedImage) {
          allImages.push({
            encodedImage,
            mimeType,
            prompt: currentPrompt,
            seed: typeof seed === "number" ? seed : undefined,
          });
        }
      }
    }

    if (allImages.length === 0) {
      throw new GLabsError("No images generated", "PARSE_ERROR");
    }

    return { images: allImages, sessionId };
  }
}
