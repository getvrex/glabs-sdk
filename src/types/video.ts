/**
 * Video generation types
 */

import type {
  AccountTier,
  AspectRatio,
  ReshootMotionType,
  VideoMode,
  VideoResolution,
} from "./common";

/** Base options for video generation */
type BaseVideoOptions = {
  /** Session ID for the request */
  sessionId: string;
  /** Project ID for the request */
  projectId: string;
  /** Aspect ratio for the video */
  aspectRatio: AspectRatio;
  /** Account tier */
  accountTier: AccountTier;
  /** Video generation mode */
  videoMode?: VideoMode;
  /** Random seed for reproducible generation */
  seed?: number;
  /** Scene ID for tracking */
  sceneId?: string;
};

/** Options for text-to-video generation */
export type GenerateTextToVideoOptions = BaseVideoOptions & {
  /** The prompt describing the video */
  prompt: string;
};

/** Options for image-to-video generation */
export type GenerateImageToVideoOptions = BaseVideoOptions & {
  /** The prompt describing the video */
  prompt: string;
  /** Media ID of the start/first frame image (GLabs path) */
  startMediaId: string;
  /** Media ID of the end/last frame image (optional, for FL mode) */
  endMediaId?: string;
  /** Base64 image bytes for Vertex AI path (start/first frame) */
  imageBase64?: string;
  /** Base64 image bytes for Vertex AI path (end/last frame, optional) */
  imageBase64End?: string;
  /** Crop coordinates for the start image */
  cropCoordinates?: { top?: number; left?: number; bottom?: number; right?: number };
};

/** Options for video extension */
export type ExtendVideoOptions = BaseVideoOptions & {
  /** Media ID of the video to extend */
  mediaId: string;
  /** The prompt for the extended portion */
  prompt: string;
  /** Start frame index for the extension point (deprecated, no longer sent) */
  startFrameIndex?: number;
  /** End frame index for the extension point (deprecated, no longer sent) */
  endFrameIndex?: number;
  /** Workflow ID for tracking (replaces sceneId in metadata) */
  workflowId?: string;
};

/** Options for video reshoot (camera control) */
export type ReshootVideoOptions = {
  /** Media ID of the video to reshoot */
  mediaId: string;
  /** Type of camera motion to apply */
  reshootMotionType: ReshootMotionType;
  /** Session ID for the request */
  sessionId: string;
  /** Project ID for the request */
  projectId: string;
  /** Aspect ratio for the video */
  aspectRatio: AspectRatio;
  /** Account tier */
  accountTier: AccountTier;
  /** Random seed for reproducible generation */
  seed?: number;
  /** Scene ID for tracking */
  sceneId?: string;
  /** Workflow ID for tracking (replaces sceneId in metadata) */
  workflowId?: string;
};

/** Options for video upscaling */
export type UpsampleVideoOptions = {
  /** Media ID of the video to upscale */
  originalMediaId: string;
  /** Session ID for the request */
  sessionId: string;
  /** Project ID for the request */
  projectId: string;
  /** Account tier */
  accountTier: AccountTier;
  /** Aspect ratio of the video */
  aspectRatio: AspectRatio;
  /** Random seed for reproducible generation */
  seed?: number;
  /** Scene ID for tracking */
  sceneId?: string;
  /** Workflow ID for tracking (replaces sceneId in metadata) */
  workflowId?: string;
  /** Video resolution for upsampling (default: VIDEO_RESOLUTION_4K) */
  resolution?: VideoResolution;
};

/** Options for reference images video generation */
export type GenerateReferenceImagesVideoOptions = BaseVideoOptions & {
  /** The prompt describing the video */
  prompt: string;
  /** Array of reference image media IDs (1-3) */
  referenceMediaIds: string[];
};

/** Result from starting a video generation operation */
export type VideoOperationResult = {
  /** Operation name for status polling */
  operationName: string;
  /** Scene ID */
  sceneId: string;
  /** Media ID from the response (media[].name field) */
  mediaId?: string;
  /** Current status */
  status: string;
  /** Remaining credits after operation */
  remainingCredits?: number;
};

/** Options for checking video status */
export type CheckVideoStatusOptions = {
  /** Operation name from the generation request (legacy format) */
  operationName?: string;
  /** Scene ID (optional, legacy format) */
  sceneId?: string;
  /** Media ID for the new status check format */
  mediaId?: string;
  /** Project ID for the new status check format */
  projectId?: string;
};

/** Options for polling a video operation until completion */
export type PollOperationOptions = {
  /** Operation name from the generation request (legacy format) */
  operationName?: string;
  /** Scene ID (optional, legacy format) */
  sceneId?: string;
  /** Media ID for the new status check format */
  mediaId?: string;
  /** Project ID for the new status check format */
  projectId?: string;
  /** Maximum number of poll attempts (default: 60) */
  maxAttempts?: number;
  /** Interval between polls in ms (default: 10000) */
  intervalMs?: number;
  /** Callback on each poll with current status */
  onProgress?: (status: VideoStatusResult, attempt: number) => void;
};

/** Result from checking video status */
export type VideoStatusResult = {
  /** Current status */
  status: string;
  /** URL to the generated video (GLabs path) */
  videoUrl?: string;
  /** Base64-encoded video bytes (Vertex AI path) */
  videoBase64?: string;
  /** URL to the video thumbnail */
  thumbnailUrl?: string;
  /** Duration in seconds */
  duration?: number;
  /** Media generation ID */
  mediaGenerationId?: string;
  /** Error message if failed */
  error?: string;
  /** Remaining credits */
  remainingCredits?: number;
};
