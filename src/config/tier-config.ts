/**
 * Tier Configuration
 *
 * Core Principles:
 * 1. All Pro/Ultra differences are defined only in this file
 * 2. Other code obtains config through adapters without conditional logic
 * 3. When adding new features, only add config in this file
 *
 * @example
 * import { getVideoApiConfig } from '@getvrex/glabs-sdk';
 * const config = getVideoApiConfig('text-to-video', 'pro', '16:9', 'fast');
 */

import type {
  AccountTier,
  AspectRatio,
  ImageAspectRatioEnum,
  ImageModel,
  PaygateTier,
  VideoAspectRatioEnum,
  VideoGenerationType,
  VideoMode,
} from "../types/common";
import type {
  FeatureSupportResult,
  ImageApiConfig,
  SupportedFeature,
  TierCapabilities,
  TierCapabilitiesRecord,
  VideoApiConfig,
  VideoModelMapping,
} from "../types/tier";

// ============================================================================
// Tier Capability Configuration (Single Source of Truth)
// ============================================================================
//
// Tier-model relationship:
// - Pro  (PAYGATE_TIER_ONE): Uses standard models (no _ultra suffix).
//   Quality mode uses base models (e.g. veo_3_1_t2v, veo_3_1_i2v_s).
//   Fast mode uses _fast variants (e.g. veo_3_1_t2v_fast, veo_3_1_i2v_s_fast).
// - Ultra (PAYGATE_TIER_TWO): Uses _ultra models for fast mode
//   (e.g. veo_3_1_t2v_fast_ultra, veo_3_1_i2v_s_fast_ultra).
//   Quality mode shares the same base models as Pro.
//
// Using _ultra models with a Pro tier account returns 400 INVALID_ARGUMENT.

const TIER_CAPABILITIES: TierCapabilitiesRecord = {
  pro: {
    supportedVideoModes: ["quality", "fast"],
    defaultVideoMode: "fast",
    paygateTier: "PAYGATE_TIER_ONE",
    supportsUpsample: true,
    supportsQualityMode: true,
    maxImageGenerationCount: 4,
  },
  ultra: {
    supportedVideoModes: ["quality", "fast"],
    defaultVideoMode: "quality",
    paygateTier: "PAYGATE_TIER_TWO",
    supportsUpsample: true,
    supportsQualityMode: true,
    maxImageGenerationCount: 4,
  },
};

// ============================================================================
// Video Model Naming Mapping Tables
// ============================================================================

const TEXT_TO_VIDEO_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      "16:9": "veo_3_1_t2v_fast",
      "9:16": "veo_3_1_t2v_fast_portrait",
      "1:1": "veo_3_1_t2v_fast",
    },
    quality: {
      "16:9": "veo_3_1_t2v",
      "9:16": "veo_3_1_t2v_portrait",
      "1:1": "veo_3_1_t2v",
    },
  },
  ultra: {
    fast: {
      "16:9": "veo_3_1_t2v_fast_ultra",
      "9:16": "veo_3_1_t2v_fast_portrait_ultra",
      "1:1": "veo_3_1_t2v_fast_ultra",
    },
    quality: {
      "16:9": "veo_3_1_t2v",
      "9:16": "veo_3_1_t2v_portrait",
      "1:1": "veo_3_1_t2v",
    },
  },
};

const IMAGE_TO_VIDEO_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      "16:9": "veo_3_1_i2v_s_fast",
      "9:16": "veo_3_1_i2v_s_fast_portrait",
      "1:1": "veo_3_1_i2v_s_fast",
    },
    quality: {
      "16:9": "veo_3_1_i2v_s",
      "9:16": "veo_3_1_i2v_s_portrait",
      "1:1": "veo_3_1_i2v_s",
    },
  },
  ultra: {
    fast: {
      "16:9": "veo_3_1_i2v_s_fast_ultra",
      "9:16": "veo_3_1_i2v_s_fast_portrait_ultra",
      "1:1": "veo_3_1_i2v_s_fast_ultra",
    },
    quality: {
      "16:9": "veo_3_1_i2v_s",
      "9:16": "veo_3_1_i2v_s_portrait",
      "1:1": "veo_3_1_i2v_s",
    },
  },
};

const IMAGE_TO_VIDEO_FL_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      "16:9": "veo_3_1_i2v_s_fast_fl",
      "9:16": "veo_3_1_i2v_s_fast_portrait_fl",
      "1:1": "veo_3_1_i2v_s_fast_fl",
    },
    quality: {
      "16:9": "veo_3_1_i2v_s_fl",
      "9:16": "veo_3_1_i2v_s_portrait_fl",
      "1:1": "veo_3_1_i2v_s_fl",
    },
  },
  ultra: {
    fast: {
      "16:9": "veo_3_1_i2v_s_fast_ultra_fl",
      "9:16": "veo_3_1_i2v_s_fast_portrait_ultra_fl",
      "1:1": "veo_3_1_i2v_s_fast_ultra_fl",
    },
    quality: {
      "16:9": "veo_3_1_i2v_s_fl",
      "9:16": "veo_3_1_i2v_s_portrait_fl",
      "1:1": "veo_3_1_i2v_s_fl",
    },
  },
};

const EXTEND_VIDEO_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      "16:9": "veo_3_1_extend_fast_landscape",
      "9:16": "veo_3_1_extend_fast_portrait",
      "1:1": "veo_3_1_extend_fast_square",
    },
    quality: {
      "16:9": "veo_3_1_extend_landscape",
      "9:16": "veo_3_1_extend_portrait",
      "1:1": "veo_3_1_extend_square",
    },
  },
  ultra: {
    fast: {
      "16:9": "veo_3_1_extend_fast_landscape_ultra",
      "9:16": "veo_3_1_extend_fast_portrait_ultra",
      "1:1": "veo_3_1_extend_fast_square_ultra",
    },
    quality: {
      "16:9": "veo_3_1_extend_landscape_ultra",
      "9:16": "veo_3_1_extend_portrait_ultra",
      "1:1": "veo_3_1_extend_square_ultra",
    },
  },
};

const RESHOOT_VIDEO_MODELS: Record<AspectRatio, string> = {
  "16:9": "veo_3_0_reshoot_landscape",
  "9:16": "veo_3_0_reshoot_portrait",
  "1:1": "veo_3_0_reshoot_square",
};

const REFERENCE_IMAGES_VIDEO_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      "16:9": "veo_3_1_r2v_fast_landscape",
      "9:16": "veo_3_1_r2v_fast_portrait",
      "1:1": "veo_3_1_r2v_fast_square",
    },
    quality: {
      "16:9": "veo_3_1_r2v_fast_landscape",
      "9:16": "veo_3_1_r2v_fast_portrait",
      "1:1": "veo_3_1_r2v_fast_square",
    },
  },
  ultra: {
    fast: {
      "16:9": "veo_3_1_r2v_fast_landscape_ultra",
      "9:16": "veo_3_1_r2v_fast_portrait_ultra",
      "1:1": "veo_3_1_r2v_fast_square_ultra",
    },
    quality: {
      "16:9": "veo_3_1_r2v_fast_landscape_ultra",
      "9:16": "veo_3_1_r2v_fast_portrait_ultra",
      "1:1": "veo_3_1_r2v_fast_square_ultra",
    },
  },
};

const UPSAMPLE_VIDEO_MODEL = "veo_3_1_upsampler_4k";

// ============================================================================
// Adapter Functions (Public Interface)
// ============================================================================

/** Get tier capabilities */
export function getTierCapabilities(tier: AccountTier): TierCapabilities {
  return TIER_CAPABILITIES[tier];
}

/** Get effective video mode (with tier restrictions applied) */
export function getEffectiveVideoMode(
  tier: AccountTier,
  requestedMode?: VideoMode
): VideoMode {
  const capabilities = TIER_CAPABILITIES[tier];

  if (!requestedMode) {
    return capabilities.defaultVideoMode;
  }

  if (!capabilities.supportedVideoModes.includes(requestedMode)) {
    return capabilities.defaultVideoMode;
  }

  return requestedMode;
}

/** Get PaygateTier for a given account tier */
export function getPaygateTier(tier: AccountTier): PaygateTier {
  return TIER_CAPABILITIES[tier].paygateTier;
}

/** Get video aspect ratio enum */
export function getVideoAspectRatioEnum(
  aspectRatio: AspectRatio
): VideoAspectRatioEnum {
  switch (aspectRatio) {
    case "9:16":
      return "VIDEO_ASPECT_RATIO_PORTRAIT";
    case "1:1":
      return "VIDEO_ASPECT_RATIO_SQUARE";
    default:
      return "VIDEO_ASPECT_RATIO_LANDSCAPE";
  }
}

/** Get image aspect ratio enum */
export function getImageAspectRatioEnum(
  aspectRatio: AspectRatio
): ImageAspectRatioEnum {
  switch (aspectRatio) {
    case "9:16":
      return "IMAGE_ASPECT_RATIO_PORTRAIT";
    case "1:1":
      return "IMAGE_ASPECT_RATIO_SQUARE";
    default:
      return "IMAGE_ASPECT_RATIO_LANDSCAPE";
  }
}

/** Get video model key */
export function getVideoModelKey(
  type: VideoGenerationType,
  tier: AccountTier,
  aspectRatio: AspectRatio,
  videoMode?: VideoMode
): string {
  if (type === "upsample") {
    return UPSAMPLE_VIDEO_MODEL;
  }

  if (type === "reshoot") {
    return RESHOOT_VIDEO_MODELS[aspectRatio];
  }

  if (type === "reference-images") {
    const effectiveMode = getEffectiveVideoMode(tier, videoMode);
    const modelKey =
      REFERENCE_IMAGES_VIDEO_MODELS[tier]?.[effectiveMode]?.[aspectRatio];
    if (!modelKey) {
      throw new Error(
        `Reference images model config not found: tier=${tier}, mode=${effectiveMode}, aspect=${aspectRatio}`
      );
    }
    return modelKey;
  }

  const effectiveMode = getEffectiveVideoMode(tier, videoMode);

  let modelMapping: VideoModelMapping;
  switch (type) {
    case "text-to-video":
      modelMapping = TEXT_TO_VIDEO_MODELS;
      break;
    case "image-to-video":
      modelMapping = IMAGE_TO_VIDEO_MODELS;
      break;
    case "image-to-video-fl":
      modelMapping = IMAGE_TO_VIDEO_FL_MODELS;
      break;
    case "extend":
      modelMapping = EXTEND_VIDEO_MODELS;
      break;
    default:
      throw new Error(`Unknown video generation type: ${type}`);
  }

  const modelKey = modelMapping[tier]?.[effectiveMode]?.[aspectRatio];

  if (!modelKey) {
    throw new Error(
      `Video model config not found: type=${type}, tier=${tier}, mode=${effectiveMode}, aspect=${aspectRatio}`
    );
  }

  return modelKey;
}

/** Check if a feature is supported for the given tier */
export function isFeatureSupported(
  feature: SupportedFeature,
  tier: AccountTier,
  aspectRatio?: AspectRatio
): FeatureSupportResult {
  const capabilities = TIER_CAPABILITIES[tier];

  switch (feature) {
    case "upsample":
      if (aspectRatio && aspectRatio !== "16:9") {
        return {
          supported: false,
          reason: "HD upscaling only supports 16:9 landscape videos",
        };
      }
      return { supported: capabilities.supportsUpsample };

    case "quality_mode":
      return {
        supported: capabilities.supportsQualityMode,
        reason: capabilities.supportsQualityMode
          ? undefined
          : "Pro account only supports Fast mode",
      };

    case "extend":
    case "reshoot":
    case "reference_images":
      return { supported: true };

    default:
      return { supported: true };
  }
}

/** Get complete video API configuration */
export function getVideoApiConfig(
  type: VideoGenerationType,
  tier: AccountTier,
  aspectRatio: AspectRatio,
  videoMode?: VideoMode
): VideoApiConfig {
  const effectiveMode = getEffectiveVideoMode(tier, videoMode);

  return {
    videoModelKey: getVideoModelKey(type, tier, aspectRatio, effectiveMode),
    userPaygateTier: getPaygateTier(tier),
    effectiveVideoMode: effectiveMode,
    aspectRatioEnum: getVideoAspectRatioEnum(aspectRatio),
  };
}

/** Get Vertex AI Imagen model ID from ImageModel */
export function getVertexImageModelId(model?: ImageModel): string {
  switch (model) {
    case "imagen-4-fast":
      return "imagen-4.0-fast-generate-001";
    case "imagen-4-ultra":
      return "imagen-4.0-ultra-generate-001";
    default:
      return "imagen-4.0-generate-001";
  }
}

/** Get complete image API configuration */
export function getImageApiConfig(
  _tier: AccountTier,
  aspectRatio: AspectRatio,
  model?: ImageModel
): ImageApiConfig {
  return {
    imageModelName: model === "nanobananapro" ? "GEM_PIX_2" : "GEM_PIX",
    aspectRatioEnum: getImageAspectRatioEnum(aspectRatio),
  };
}
