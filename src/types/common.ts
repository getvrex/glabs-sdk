/**
 * Common types used across the SDK
 */

/** Account tier type - Pro or Ultra subscription level */
export type AccountTier = "pro" | "ultra";

/** Video generation mode - Quality (slower, better) or Fast */
export type VideoMode = "quality" | "fast";

/** Aspect ratio for media generation */
export type AspectRatio = "16:9" | "9:16" | "1:1";

/** Image generation model */
export type ImageModel = "nanobanana" | "nanobananapro" | "nanobanana2" | "imagen-4" | "imagen-4-fast" | "imagen-4-ultra";

/** Video generation type */
export type VideoGenerationType =
  | "text-to-video"
  | "image-to-video"
  | "image-to-video-fl"
  | "extend"
  | "reshoot"
  | "upsample"
  | "reference-images";

/** PaygateTier for API requests */
export type PaygateTier = "PAYGATE_TIER_ONE" | "PAYGATE_TIER_TWO";

/** Video aspect ratio enum for API requests */
export type VideoAspectRatioEnum =
  | "VIDEO_ASPECT_RATIO_LANDSCAPE"
  | "VIDEO_ASPECT_RATIO_PORTRAIT"
  | "VIDEO_ASPECT_RATIO_SQUARE";

/** Image aspect ratio enum for API requests */
export type ImageAspectRatioEnum =
  | "IMAGE_ASPECT_RATIO_LANDSCAPE"
  | "IMAGE_ASPECT_RATIO_PORTRAIT"
  | "IMAGE_ASPECT_RATIO_SQUARE";

/** Video resolution for upsampling */
export type VideoResolution = "VIDEO_RESOLUTION_1080P" | "VIDEO_RESOLUTION_4K";

/** Camera control motion types for video reshoot */
export type ReshootMotionType =
  // Camera Control
  | "RESHOOT_MOTION_TYPE_UP"
  | "RESHOOT_MOTION_TYPE_DOWN"
  | "RESHOOT_MOTION_TYPE_LEFT_TO_RIGHT"
  | "RESHOOT_MOTION_TYPE_RIGHT_TO_LEFT"
  | "RESHOOT_MOTION_TYPE_FORWARD"
  | "RESHOOT_MOTION_TYPE_BACKWARD"
  | "RESHOOT_MOTION_TYPE_DOLLY_IN_ZOOM_OUT"
  | "RESHOOT_MOTION_TYPE_DOLLY_OUT_ZOOM_IN_LARGE"
  // Camera Position
  | "RESHOOT_MOTION_TYPE_STATIONARY_UP"
  | "RESHOOT_MOTION_TYPE_STATIONARY_DOWN"
  | "RESHOOT_MOTION_TYPE_STATIONARY_LEFT_LARGE"
  | "RESHOOT_MOTION_TYPE_STATIONARY_RIGHT_LARGE"
  | "RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_IN_ZOOM_OUT"
  | "RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_OUT_ZOOM_IN_LARGE";

/** Video generation status */
export type VideoStatus =
  | "MEDIA_GENERATION_STATUS_PENDING"
  | "MEDIA_GENERATION_STATUS_ACTIVE"
  | "MEDIA_GENERATION_STATUS_PROCESSING"
  | "MEDIA_GENERATION_STATUS_COMPLETED"
  | "MEDIA_GENERATION_STATUS_SUCCESSFUL"
  | "MEDIA_GENERATION_STATUS_FAILED"
  | "UNKNOWN";

/** Base client context for API requests */
export type ClientContext = {
  sessionId: string;
  projectId?: string;
  tool?: string;
  recaptchaToken?: string;
  userPaygateTier?: PaygateTier;
};
