/**
 * Project Service
 *
 * Handles project listing and retrieval from Google Labs.
 */

import { ENDPOINTS } from "../constants";
import type { GLabsLogger, ResolvedConfig } from "../types/client";
import type {
  GetProjectOptions,
  GetProjectResult,
  ListProjectsOptions,
  ListProjectsResult,
  Project,
} from "../types/project";
import { GLabsError } from "../utils";

/** Tool name for project API */
const TOOL_NAME = "PINHOLE";

/** Options for creating a project service instance */
export type ProjectServiceOptions = {
  /** Resolved client configuration */
  config: ResolvedConfig;
};

/** Project service for listing and fetching projects */
export class ProjectService {
  private readonly config: ResolvedConfig;
  private readonly logger: GLabsLogger;
  /** Cached first project ID for auto-resolution */
  private cachedFirstProjectId: string | null = null;

  constructor(options: ProjectServiceOptions) {
    this.config = options.config;
    this.logger = options.config.logger;
  }

  /**
   * Build tRPC input query parameter
   */
  private buildInputParam(json: Record<string, unknown>): string {
    const input = { json };
    return encodeURIComponent(JSON.stringify(input));
  }

  /**
   * Build headers for project API requests
   */
  private buildHeaders(): Record<string, string> {
    if (!this.config.sessionToken) {
      throw new GLabsError(
        "sessionToken is required for project API. Get it from __Secure-next-auth.session-token cookie at labs.google",
        "SESSION_TOKEN_REQUIRED"
      );
    }
    return {
      Accept: "*/*",
      "Content-Type": "application/json",
      Cookie: `__Secure-next-auth.session-token=${this.config.sessionToken}`,
    };
  }

  /**
   * List user projects
   */
  async listProjects(
    options: ListProjectsOptions = {}
  ): Promise<ListProjectsResult> {
    const { pageSize = 20, cursor } = options;

    const jsonPayload: Record<string, unknown> = {
      pageSize,
      toolName: TOOL_NAME,
      cursor: cursor ?? null,
    };

    // Add meta for cursor if not provided (tRPC requirement)
    const input: Record<string, unknown> = { json: jsonPayload };
    if (!cursor) {
      input.meta = { values: { cursor: ["undefined"] } };
    }

    const url = `${ENDPOINTS.SEARCH_USER_PROJECTS}?input=${encodeURIComponent(JSON.stringify(input))}`;
    const headers = this.buildHeaders();

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        "[Project] Failed to list projects:",
        response.status,
        errorText
      );
      throw new GLabsError(
        `Failed to list projects: ${response.status} ${response.statusText}`,
        "PROJECT_LIST_ERROR",
        response.status
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return this.parseListProjectsResponse(data);
  }

  /**
   * Get a specific project by ID
   */
  async getProject(options: GetProjectOptions): Promise<GetProjectResult> {
    const { projectId } = options;

    const jsonPayload = {
      projectId,
      toolName: TOOL_NAME,
    };

    const url = `${ENDPOINTS.GET_PROJECT}?input=${this.buildInputParam(jsonPayload)}`;
    const headers = this.buildHeaders();

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        "[Project] Failed to get project:",
        response.status,
        errorText
      );
      throw new GLabsError(
        `Failed to get project: ${response.status} ${response.statusText}`,
        "PROJECT_GET_ERROR",
        response.status
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return this.parseGetProjectResponse(data);
  }

  /**
   * Get the first available project ID
   * Uses cached value if available, otherwise fetches from API
   */
  async getFirstProjectId(): Promise<string> {
    if (this.cachedFirstProjectId) {
      return this.cachedFirstProjectId;
    }

    const result = await this.listProjects({ pageSize: 1 });

    if (result.projects.length === 0) {
      throw new GLabsError(
        "No projects found. Please create a project first at labs.google/fx",
        "NO_PROJECTS_FOUND"
      );
    }

    this.cachedFirstProjectId = result.projects[0]!.projectId;
    this.logger.log(
      `[Project] Auto-selected project: ${this.cachedFirstProjectId}`
    );

    return this.cachedFirstProjectId;
  }

  /**
   * Clear the cached first project ID
   */
  clearCache(): void {
    this.cachedFirstProjectId = null;
  }

  /**
   * Parse list projects response from tRPC format
   */
  private parseListProjectsResponse(
    data: Record<string, unknown>
  ): ListProjectsResult {
    const result = data.result as Record<string, unknown> | undefined;
    const resultData = result?.data as Record<string, unknown> | undefined;
    const json = resultData?.json as Record<string, unknown> | undefined;
    const innerResult = json?.result as Record<string, unknown> | undefined;

    const projects = (innerResult?.projects as Project[]) ?? [];
    const nextCursor = innerResult?.nextCursor as string | undefined;

    return {
      projects,
      nextCursor,
    };
  }

  /**
   * Parse get project response from tRPC format
   */
  private parseGetProjectResponse(
    data: Record<string, unknown>
  ): GetProjectResult {
    const result = data.result as Record<string, unknown> | undefined;
    const resultData = result?.data as Record<string, unknown> | undefined;
    const json = resultData?.json as Record<string, unknown> | undefined;
    const innerResult = json?.result as Record<string, unknown> | undefined;

    if (!innerResult?.projectId) {
      throw new GLabsError("Invalid project response", "PARSE_ERROR");
    }

    return {
      projectId: innerResult.projectId as string,
      projectInfo: innerResult.projectInfo as GetProjectResult["projectInfo"],
    };
  }
}
