/**
 * Image generation types
 */

import type { AspectRatio, ImageModel } from "./common";

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
};

/** Result from generating images */
export type GenerateImageResult = {
  /** Array of generated images */
  images: GeneratedImage[];
  /** Session ID */
  sessionId: string;
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
};
