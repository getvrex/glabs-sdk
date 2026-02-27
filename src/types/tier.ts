/**
 * Tier configuration types
 */

import type {
  AccountTier,
  ImageAspectRatioEnum,
  PaygateTier,
  VideoAspectRatioEnum,
  VideoMode,
} from "./common";

/** Capabilities for a specific tier */
export type TierCapabilities = {
  /** Supported video modes */
  supportedVideoModes: VideoMode[];
  /** Default video mode */
  defaultVideoMode: VideoMode;
  /** PaygateTier for API requests */
  paygateTier: PaygateTier;
  /** Whether HD upscaling is supported */
  supportsUpsample: boolean;
  /** Whether Quality mode is supported */
  supportsQualityMode: boolean;
  /** Maximum images per generation batch */
  maxImageGenerationCount: number;
};

/** Video API configuration */
export type VideoApiConfig = {
  /** Video model key for the API request */
  videoModelKey: string;
  /** PaygateTier for the API request */
  userPaygateTier: PaygateTier;
  /** Effective video mode after tier restrictions */
  effectiveVideoMode: VideoMode;
  /** Aspect ratio enum for the API request */
  aspectRatioEnum: VideoAspectRatioEnum;
};

/** Image API configuration */
export type ImageApiConfig = {
  /** Image model name for the API request */
  imageModelName: "GEM_PIX" | "GEM_PIX_2" | "NARWHAL";
  /** Aspect ratio enum for the API request */
  aspectRatioEnum: ImageAspectRatioEnum;
};

/** Feature support check result */
export type FeatureSupportResult = {
  /** Whether the feature is supported */
  supported: boolean;
  /** Reason if not supported */
  reason?: string;
};

/** Supported features that can be checked */
export type SupportedFeature =
  | "upsample"
  | "quality_mode"
  | "extend"
  | "reshoot"
  | "reference_images";

/** Video model mapping structure */
export type VideoModelMapping = {
  [tier: string]: {
    [mode: string]: {
      [aspect: string]: string;
    };
  };
};

/** Tier capabilities record */
export type TierCapabilitiesRecord = Record<AccountTier, TierCapabilities>;
