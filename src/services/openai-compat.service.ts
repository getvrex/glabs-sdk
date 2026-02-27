/**
 * OpenAI-compatible message parser and model router
 *
 * Maps OpenAI chat completion format to GLabsClient image/video generation calls.
 */

import { GLabsClient } from "../client";
import type { AspectRatio } from "../types/common";
import type {
  DetectedGenerationType,
  OpenAIChatCompletionRequest,
  OpenAIMessage,
  OpenAIModel,
} from "../types/openai-compat";

/** Model configuration entry */
type ModelConfig = {
  type: DetectedGenerationType;
  aspectRatio: AspectRatio;
  description: string;
};

/** Available model definitions with their generation types and configs */
const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // Image models
  "imagen-4-landscape": {
    type: "image",
    aspectRatio: "16:9",
    description: "Imagen 4 Landscape",
  },
  "imagen-4-portrait": {
    type: "image",
    aspectRatio: "9:16",
    description: "Imagen 4 Portrait",
  },
  "imagen-4-square": {
    type: "image",
    aspectRatio: "1:1",
    description: "Imagen 4 Square",
  },
  "nanobanana2-landscape": {
    type: "image",
    aspectRatio: "16:9",
    description: "Nanobanana2 Landscape",
  },
  "nanobanana2-portrait": {
    type: "image",
    aspectRatio: "9:16",
    description: "Nanobanana2 Portrait",
  },
  "nanobanana2-square": {
    type: "image",
    aspectRatio: "1:1",
    description: "Nanobanana2 Square",
  },
  // Video T2V models
  "veo-3-t2v-landscape": {
    type: "video-t2v",
    aspectRatio: "16:9",
    description: "Veo 3 Text-to-Video Landscape",
  },
  "veo-3-t2v-portrait": {
    type: "video-t2v",
    aspectRatio: "9:16",
    description: "Veo 3 Text-to-Video Portrait",
  },
  "veo-3-t2v-square": {
    type: "video-t2v",
    aspectRatio: "1:1",
    description: "Veo 3 Text-to-Video Square",
  },
  // Video I2V models
  "veo-3-i2v-landscape": {
    type: "video-i2v",
    aspectRatio: "16:9",
    description: "Veo 3 Image-to-Video Landscape",
  },
  "veo-3-i2v-portrait": {
    type: "video-i2v",
    aspectRatio: "9:16",
    description: "Veo 3 Image-to-Video Portrait",
  },
  "veo-3-i2v-square": {
    type: "video-i2v",
    aspectRatio: "1:1",
    description: "Veo 3 Image-to-Video Square",
  },
};

/**
 * Service that bridges OpenAI chat completion format to GLabsClient calls
 */
export class OpenAICompatService {
  constructor(private readonly client: GLabsClient) {}

  /** Get list of available models */
  getModels(): OpenAIModel[] {
    const now = Math.floor(Date.now() / 1000);
    return Object.entries(MODEL_REGISTRY).map(([id]) => ({
      id,
      object: "model" as const,
      created: now,
      owned_by: "google-labs",
    }));
  }

  /** Check if a model exists */
  isValidModel(model: string): boolean {
    return model in MODEL_REGISTRY;
  }

  /** Get model config */
  getModelConfig(model: string): ModelConfig | undefined {
    return MODEL_REGISTRY[model];
  }

  /** Extract text prompt and images from OpenAI messages */
  parseMessages(messages: OpenAIMessage[]): {
    prompt: string;
    images: string[];
  } {
    const textParts: string[] = [];
    const images: string[] = [];

    for (const msg of messages) {
      if (msg.role !== "user") continue;

      if (typeof msg.content === "string") {
        textParts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text") {
            textParts.push(part.text);
          } else if (part.type === "image_url") {
            images.push(part.image_url.url);
          }
        }
      }
    }

    return { prompt: textParts.join("\n"), images };
  }

  /** Extract base64 data from a data URL or return null */
  extractBase64(imageUrl: string): string | null {
    const match = /^data:image\/[^;]+;base64,(.+)$/.exec(imageUrl);
    if (match?.[1]) return match[1];
    return null;
  }

  /** Generate content based on model type */
  async generate(request: OpenAIChatCompletionRequest): Promise<string> {
    const modelConfig = MODEL_REGISTRY[request.model];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${request.model}`);
    }

    const { prompt, images } = this.parseMessages(request.messages);
    const sessionId = GLabsClient.generateSessionId();

    switch (modelConfig.type) {
      case "image":
        const imageModel = request.model.startsWith("nanobanana") ? "nanobanana2" : undefined;
        return this.generateImage(prompt, images, sessionId, modelConfig.aspectRatio, imageModel as any);

      case "video-t2v":
        return this.generateTextToVideo(
          prompt,
          sessionId,
          modelConfig.aspectRatio
        );

      case "video-i2v":
        return this.generateImageToVideo(
          prompt,
          images,
          sessionId,
          modelConfig.aspectRatio
        );

      case "video-ref":
        throw new Error(
          "Reference images video not yet supported via OpenAI compat layer"
        );

      default:
        throw new Error(`Unsupported generation type: ${modelConfig.type}`);
    }
  }

  /** Generate image and return markdown with base64 */
  private async generateImage(
    prompt: string,
    images: string[],
    sessionId: string,
    aspectRatio: AspectRatio,
    model?: "nanobanana2"
  ): Promise<string> {
    const referenceImageIds: string[] = [];

    if (images && images.length > 0) {
      for (const imageUrl of images) {
        const base64 = this.extractBase64(imageUrl);
        if (base64) {
          try {
            const uploadResult = await this.client.images.upload({
              imageBase64: base64,
              sessionId,
              aspectRatio,
            });
            const mediaId = uploadResult.mediaId ?? uploadResult.mediaGenerationId;
            if (mediaId) {
              referenceImageIds.push(mediaId);
            }
          } catch (error) {
            console.error("[OpenAI] Failed to upload reference image:", error);
          }
        }
      }
    }

    const result = await this.client.images.generate({
      prompt,
      sessionId,
      aspectRatio,
      model,
      referenceImages: referenceImageIds.length > 0 ? referenceImageIds : undefined,
    });

    if (result.images && result.images.length > 0) {
      const parts = result.images.map((img, i) => {
        if (img.encodedImage) {
          return `![Generated Image ${i + 1}](data:image/png;base64,${img.encodedImage})`;
        }
        if (img.fifeUrl) {
          return `![Generated Image ${i + 1}](${img.fifeUrl})`;
        }
        return `Generated Image ${i + 1}: [no data]`;
      });
      return parts.join("\n\n");
    }

    return "Image generation completed but no images were returned.";
  }

  /** Generate text-to-video and poll for result */
  private async generateTextToVideo(
    prompt: string,
    sessionId: string,
    aspectRatio: AspectRatio
  ): Promise<string> {
    const operation = await this.client.videos.generateTextToVideo({
      prompt,
      sessionId,
      aspectRatio,
    });

    const status = await this.client.videos.pollOperation({
      operationName: operation.operationName,
    });

    if (status.videoUrl) {
      return `Video generated successfully.\n\nVideo URL: ${status.videoUrl}`;
    }

    return `Video generation completed. Operation: ${operation.operationName}, Status: ${status.status}`;
  }

  /** Generate image-to-video and poll for result */
  private async generateImageToVideo(
    prompt: string,
    images: string[],
    sessionId: string,
    aspectRatio: AspectRatio
  ): Promise<string> {
    if (images.length === 0) {
      throw new Error(
        "Image-to-video requires at least one image in the message"
      );
    }

    const base64 = this.extractBase64(images[0]!);
    if (!base64) {
      throw new Error(
        "Image must be provided as base64 data URL for image-to-video generation"
      );
    }

    // Upload the image first to get a startMediaId
    const uploadResult = await this.client.images.upload({
      imageBase64: base64,
      sessionId,
      aspectRatio,
    });
    const startMediaId = uploadResult.mediaId ?? uploadResult.mediaGenerationId ?? "";

    const operation = await this.client.videos.generateImageToVideo({
      prompt,
      startMediaId,
      sessionId,
      aspectRatio,
    });

    const status = await this.client.videos.pollOperation({
      operationName: operation.operationName,
    });

    if (status.videoUrl) {
      return `Video generated successfully.\n\nVideo URL: ${status.videoUrl}`;
    }

    return `Video generation completed. Operation: ${operation.operationName}, Status: ${status.status}`;
  }
}
