/**
 * @getvrex/glabs-sdk
 *
 * TypeScript SDK for Google Labs AI media generation APIs.
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
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { GLabsClient } from "./client";
// Tier configuration utilities
export {
  getEffectiveVideoMode,
  getImageApiConfig,
  getImageAspectRatioEnum,
  getPaygateTier,
  getTierCapabilities,
  getVertexImageModelId,
  getVideoApiConfig,
  getVideoAspectRatioEnum,
  getVideoModelKey,
  isFeatureSupported,
} from "./config";
// Services (for advanced usage)
export {
  defaultRecaptchaProvider,
  ImageService,
  OpenAICompatService,
  PlaywrightRecaptchaService,
  RecaptchaService,
  VertexImageService,
  VideoService,
} from "./services";
// OpenAI-compatible server
export { OpenAIServer } from "./openai-server";
// Types
export type {
  // Common types
  AccountTier,
  AspectRatio,
  // Video types
  CheckVideoStatusOptions,
PollOperationOptions,
  ClientContext,
  // Image types
  CreditStatusResult,
  ExtendVideoOptions,
  // Tier types
  FeatureSupportResult,
  GeneratedImage,
  GenerateImageOptions,
  GenerateImageResult,
  GenerateImageToVideoOptions,
  GenerateReferenceImagesVideoOptions,
  GenerateTextToVideoOptions,
  // Client types
  GLabsClientConfig,
  GLabsLogger,
  ImageApiConfig,
  ImageAspectRatioEnum,
  ImageModel,
  ImageReference,
  PaygateTier,
  // reCAPTCHA types
  PlaywrightRecaptchaOptions,
  RecaptchaConfig,
  RecaptchaProvider,
  RecaptchaTokenResult,
  ReshootMotionType,
  ReshootVideoOptions,
  ResolvedConfig,
  SessionInfo,
  SupportedFeature,
  TierCapabilities,
  VertexAIConfig,
  VertexImageApiConfig,
  UploadImageOptions,
  UploadImageResult,
  UpsampleImageOptions,
  UpsampleImageResult,
  UpsampleVideoOptions,
  VideoApiConfig,
  VideoAspectRatioEnum,
  VideoGenerationType,
  VideoMode,
  VideoOperationResult,
  VideoStatus,
  VideoStatusResult,
  // OpenAI-compatible types
  DetectedGenerationType,
  OpenAIChatCompletionChoice,
  OpenAIChatCompletionChunk,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIContentPart,
  OpenAIMessage,
  OpenAIModel,
  OpenAIModelList,
  OpenAIServerConfig,
} from "./types";
// Error class
export { GLabsError } from "./utils";
