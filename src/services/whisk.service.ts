/**
 * Whisk Image Generation Service
 *
 * Self-contained service for Google Labs Whisk API.
 * Handles auth token management and image generation.
 */

import { fetchWithRetry } from "../utils/fetch";
import { GLabsError } from "../utils/errors";

const WHISK_ENDPOINTS = {
  SESSION: "https://labs.google/fx/api/auth/session",
  CREATE_WORKFLOW:
    "https://labs.google/fx/api/trpc/media.createOrUpdateWorkflow",
  GENERATE_IMAGE:
    "https://aisandbox-pa.googleapis.com/v1/whisk:generateImage",
} as const;

type WhiskAspectRatio = "SQUARE" | "PORTRAIT" | "LANDSCAPE";

const ASPECT_RATIO_MAP: Record<WhiskAspectRatio, string> = {
  SQUARE: "IMAGE_ASPECT_RATIO_SQUARE",
  PORTRAIT: "IMAGE_ASPECT_RATIO_PORTRAIT",
  LANDSCAPE: "IMAGE_ASPECT_RATIO_LANDSCAPE",
};

export interface WhiskGenerateOptions {
  aspectRatio?: WhiskAspectRatio;
  seed?: number;
}

export interface WhiskGenerateResult {
  base64: string;
  mediaGenerationId: string;
  workflowId: string;
}

export class WhiskService {
  private readonly cookie: string;
  private authToken?: string;
  private tokenExpiry?: Date;

  constructor(cookie: string, authToken?: string) {
    if (!cookie?.trim()) {
      throw new GLabsError("Cookie string is required", "WHISK_AUTH_ERROR");
    }
    this.cookie = cookie;
    if (authToken?.trim()) {
      this.authToken = authToken.trim();
      // Assume provided token expires in 3 hours
      this.tokenExpiry = new Date(Date.now() + 3 * 60 * 60 * 1000);
    }
  }

  /** Refresh bearer token from session endpoint */
  private async refreshToken(): Promise<void> {
    const response = await fetchWithRetry(WHISK_ENDPOINTS.SESSION, {
      method: "GET",
      headers: { cookie: this.cookie },
      maxRetries: 1,
      timeout: 30_000,
    });

    if (!response.ok) {
      throw new GLabsError(
        `Session refresh failed: ${response.status}`,
        "WHISK_AUTH_ERROR",
        response.status
      );
    }

    const session = (await response.json()) as Record<string, unknown>;

    if (session.error === "ACCESS_TOKEN_REFRESH_NEEDED") {
      throw new GLabsError(
        "Session cookie expired, new cookie required",
        "WHISK_AUTH_ERROR"
      );
    }

    this.authToken = session.access_token as string;
    this.tokenExpiry = new Date(session.expires as string);
  }

  /** Get a valid bearer token, refreshing if needed */
  private async getToken(): Promise<string> {
    const expired =
      !this.authToken ||
      !this.tokenExpiry ||
      Date.now() + 30_000 >= this.tokenExpiry.getTime();

    if (expired) {
      await this.refreshToken();
    }
    return this.authToken!;
  }

  /** Generate a client-side workflowId, or create via API if cookie session is valid */
  private async getWorkflowId(): Promise<string> {
    // Try creating via API first (needs valid cookie session)
    try {
      const response = await fetchWithRetry(WHISK_ENDPOINTS.CREATE_WORKFLOW, {
        method: "POST",
        headers: {
          cookie: this.cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          json: {
            workflowMetadata: { workflowName: `whisk-${Date.now()}` },
          },
        }),
        maxRetries: 0,
        timeout: 15_000,
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const workflowId =
          data?.result?.data?.json?.workflowId ?? data?.workflowId;
        if (workflowId) return workflowId;
      }
    } catch {
      // Fall through to client-side ID
    }

    // Fallback: generate client-side ID (API accepts arbitrary workflowIds)
    return crypto.randomUUID();
  }

  /**
   * Generate an image using Whisk API
   *
   * Obtains a workflowId, calls whisk:generateImage, returns base64.
   */
  async generateImage(
    prompt: string,
    options?: WhiskGenerateOptions
  ): Promise<WhiskGenerateResult> {
    if (!prompt?.trim()) {
      throw new GLabsError("Prompt is required", "WHISK_VALIDATION_ERROR");
    }

    const aspectRatio = ASPECT_RATIO_MAP[options?.aspectRatio ?? "SQUARE"];
    const seed = options?.seed ?? 0;

    // Get token and workflowId in parallel
    const [token, workflowId] = await Promise.all([
      this.getToken(),
      this.getWorkflowId(),
    ]);

    const response = await fetchWithRetry(WHISK_ENDPOINTS.GENERATE_IMAGE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientContext: { workflowId },
        imageModelSettings: {
          imageModel: "IMAGEN_3_5",
          aspectRatio,
        },
        seed,
        prompt,
        mediaCategory: "MEDIA_CATEGORY_BOARD",
      }),
      maxRetries: 2,
      timeout: 120_000,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new GLabsError(
        `Whisk generate failed: ${response.status} ${errorText}`,
        "WHISK_API_ERROR",
        response.status
      );
    }

    const data = (await response.json()) as any;
    const img = data?.imagePanels?.[0]?.generatedImages?.[0];

    if (!img?.encodedImage) {
      throw new GLabsError(
        "No image in Whisk response",
        "WHISK_API_ERROR"
      );
    }

    return {
      base64: img.encodedImage,
      mediaGenerationId: img.mediaGenerationId ?? "",
      workflowId: img.workflowId ?? workflowId,
    };
  }
}
