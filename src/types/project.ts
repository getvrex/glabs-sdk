/**
 * Project types
 */

/** Project info from API */
export type ProjectInfo = {
  /** Project title */
  projectTitle: string;
  /** Thumbnail media key (optional) */
  thumbnailMediaKey?: string;
};

/** Clip in a scene */
export type ProjectClip = {
  /** Clip ID */
  clipId: string;
  /** Start time */
  startTime: string;
  /** End time */
  endTime: string;
};

/** Scene in a project */
export type ProjectScene = {
  /** Scene ID */
  sceneId: string;
  /** Scene name */
  sceneName: string;
  /** Clips in the scene */
  clips?: ProjectClip[];
  /** Creation time */
  createTime: string;
};

/** Project from list/search API */
export type Project = {
  /** Project ID */
  projectId: string;
  /** Project info */
  projectInfo: ProjectInfo;
  /** Creation time */
  creationTime: string;
  /** Scenes in the project (optional) */
  scenes?: ProjectScene[];
};

/** Options for listing projects */
export type ListProjectsOptions = {
  /** Page size (default: 20) */
  pageSize?: number;
  /** Cursor for pagination */
  cursor?: string;
};

/** Result from listing projects */
export type ListProjectsResult = {
  /** List of projects */
  projects: Project[];
  /** Next page cursor (if more results exist) */
  nextCursor?: string;
};

/** Options for getting a project */
export type GetProjectOptions = {
  /** Project ID */
  projectId: string;
};

/** Result from getting a project */
export type GetProjectResult = {
  /** Project ID */
  projectId: string;
  /** Project info */
  projectInfo: ProjectInfo;
};
