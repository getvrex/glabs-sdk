/**
 * OpenAI-compatible API types
 *
 * Types for the OpenAI-compatible server layer that wraps GLabsClient
 * behind standard OpenAI API endpoints.
 */

/** OpenAI chat completion request */
export type OpenAIChatCompletionRequest = {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
};

/** OpenAI message format */
export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenAIContentPart[];
};

/** Multimodal content part */
export type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: string } };

/** OpenAI chat completion response */
export type OpenAIChatCompletionResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: OpenAIChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/** Chat completion choice */
export type OpenAIChatCompletionChoice = {
  index: number;
  message: { role: "assistant"; content: string };
  finish_reason: "stop" | "length" | null;
};

/** SSE streaming chunk */
export type OpenAIChatCompletionChunk = {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: {
    index: number;
    delta: { role?: "assistant"; content?: string };
    finish_reason: "stop" | null;
  }[];
};

/** OpenAI model object */
export type OpenAIModel = {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
};

/** OpenAI models list response */
export type OpenAIModelList = {
  object: "list";
  data: OpenAIModel[];
};

/** Server configuration */
export type OpenAIServerConfig = {
  /** API key for authentication (checked against Authorization: Bearer <key>) */
  apiKey?: string;
  /** Host to bind to (default: "0.0.0.0") */
  host?: string;
  /** Port to listen on (default: 8000) */
  port?: number;
};

/** Generation type detected from model name */
export type DetectedGenerationType =
  | "image"
  | "video-t2v"
  | "video-i2v"
  | "video-ref";
