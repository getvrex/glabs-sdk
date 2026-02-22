/**
 * Video generation types
 */

import type {
  AccountTier,
  AspectRatio,
  ReshootMotionType,
  VideoMode,
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
  /** Media ID of the start/first frame image */
  startMediaId: string;
  /** Media ID of the end/last frame image (optional, for FL mode) */
  endMediaId?: string;
};

/** Options for video extension */
export type ExtendVideoOptions = BaseVideoOptions & {
  /** Media ID of the video to extend */
  mediaId: string;
  /** The prompt for the extended portion */
  prompt: string;
  /** Start frame index for the extension point */
  startFrameIndex?: number;
  /** End frame index for the extension point */
  endFrameIndex?: number;
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
};

/** Options for video upscaling */
export type UpsampleVideoOptions = {
  /** Media ID of the video to upscale */
  originalMediaId: string;
  /** Session ID for the request */
  sessionId: string;
  /** Aspect ratio of the video */
  aspectRatio: AspectRatio;
  /** Random seed for reproducible generation */
  seed?: number;
  /** Scene ID for tracking */
  sceneId?: string;
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
  /** Current status */
  status: string;
  /** Remaining credits after operation */
  remainingCredits?: number;
};

/** Options for checking video status */
export type CheckVideoStatusOptions = {
  /** Operation name from the generation request */
  operationName: string;
  /** Scene ID (optional) */
  sceneId?: string;
};

/** Options for polling a video operation until completion */
export type PollOperationOptions = {
  /** Operation name from the generation request */
  operationName: string;
  /** Scene ID (optional) */
  sceneId?: string;
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
  /** URL to the generated video */
  videoUrl?: string;
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
