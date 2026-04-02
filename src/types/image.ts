/**
 * Image generation types
 */

import type { AspectRatio, ImageModel, ImageQuality, ImageSize } from "./common";

/** Reference image for generation */
export type ImageReference = {
  mediaId?: string;
  mediaGenerationId?: string;
};

/** Options for uploading an image */
export type UploadImageOptions = {
  /** Base64-encoded image data (with or without data URL prefix) */
  imageBase64: string;
  /** Session ID for the request */
  sessionId: string;
  /** Aspect ratio for the uploaded image */
  aspectRatio?: AspectRatio;
  /** Project ID (required for flow/uploadImage endpoint) */
  projectId?: string;
  /** File name for the uploaded image */
  fileName?: string;
  /** MIME type override (auto-detected from data URL if not provided) */
  mimeType?: string;
};

/** Result from uploading an image */
export type UploadImageResult = {
  mediaGenerationId?: string;
  mediaId?: string;
  width?: number;
  height?: number;
  workflowId?: string;
  sessionId: string;
};

/** Options for generating images */
export type GenerateImageOptions = {
  /** The prompt describing the image to generate */
  prompt: string;
  /** Project ID for the request */
  projectId: string;
  /** Session ID for the request */
  sessionId: string;
  /** Aspect ratio for the generated image */
  aspectRatio: AspectRatio;
  /** Reference images to use as inspiration */
  references?: ImageReference[];
  /** Random seed for reproducible generation */
  seed?: number;
  /** Number of images to generate (1-4) */
  count?: number;
  /** Image model to use */
  model?: ImageModel;
  /** Multiple different prompts (overrides count) */
  prompts?: string[];
  /** Output image size — triggers auto-upsample after generation ("2k" or "4k") */
  imageSize?: ImageSize;
  /** Image quality (OpenAI-compatible) — "medium" maps to 2k, "high"/"hd"/"ultra" maps to 4k */
  quality?: ImageQuality;
};

/** A single generated image */
export type GeneratedImage = {
  /** Base64-encoded image data */
  encodedImage?: string;
  /** Media ID for the generated image */
  mediaId?: string;
  /** Media generation ID */
  mediaGenerationId?: string;
  /** Workflow ID */
  workflowId?: string;
  /** The prompt used for this image */
  prompt?: string;
  /** The seed used for this image */
  seed?: number;
  /** MIME type of the image */
  mimeType?: string;
  /** URL to the image on Google's CDN */
  fifeUrl?: string;
  /** Whether this image was upsampled */
  upsampled?: boolean;
  /** Upsample resolution applied (e.g. "2k", "4k") */
  upsampledResolution?: string;
};

/** Result from generating images */
export type GenerateImageResult = {
  /** Array of generated images */
  images: GeneratedImage[];
  /** Session ID */
  sessionId: string;
};

/** Options for upsampling an image */
export type UpsampleImageOptions = {
  /** Media ID of the image to upsample */
  mediaId: string;
  /** Target resolution */
  targetResolution?: "UPSAMPLE_IMAGE_RESOLUTION_2K" | "UPSAMPLE_IMAGE_RESOLUTION_4K";
  /** Project ID */
  projectId?: string;
  /** Session ID */
  sessionId?: string;
};

/** Result from upsampling an image */
export type UpsampleImageResult = {
  /** Base64 encoded upsampled image */
  encodedImage: string;
};

/** Options for getting credit status */
export type CreditStatusResult = {
  /** Number of credits remaining */
  credits: number;
  /** User's payment tier */
  userPaygateTier: string;
  /** G1 membership state */
  g1MembershipState: string;
  /** Whether animate feature is enabled for user's country */
  isUserAnimateCountryEnabled: boolean;
  /** Whether GemPix2 credit feature is available */
  isGemPix2CreditAvailable?: boolean;
};
