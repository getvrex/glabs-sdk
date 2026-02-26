/**
 * OpenAI-compatible HTTP server
 *
 * Wraps GLabsClient behind standard OpenAI API endpoints:
 * - POST /v1/chat/completions
 * - GET  /v1/models
 *
 * Uses only Node.js built-in `http` module (zero external server dependencies).
 *
 * @example
 * ```typescript
 * import { GLabsClient } from '@getvrex/glabs-sdk';
 * import { OpenAIServer } from '@getvrex/glabs-sdk/openai';
 *
 * const client = new GLabsClient({ ... });
 * const server = new OpenAIServer(client, { port: 8000, apiKey: 'sk-xxx' });
 * await server.start();
 * ```
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { GLabsClient } from "./client";
import { OpenAICompatService } from "./services/openai-compat.service";
import type {
  OpenAIChatCompletionChunk,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIServerConfig,
} from "./types/openai-compat";

/** Generate a unique completion ID */
function generateCompletionId(): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now());
  return `chatcmpl-${id}`;
}

/**
 * OpenAI-compatible HTTP server wrapping GLabsClient
 */
export class OpenAIServer {
  private readonly service: OpenAICompatService;
  private readonly config: Required<OpenAIServerConfig>;
  private server?: Server;

  constructor(client: GLabsClient, config: OpenAIServerConfig = {}) {
    this.service = new OpenAICompatService(client);
    this.config = {
      apiKey: config.apiKey ?? "",
      host: config.host ?? "0.0.0.0",
      port: config.port ?? 8000,
    };
  }

  /** Start the HTTP server */
  async start(): Promise<void> {
    this.server = createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        console.error("[OpenAI Server] Unhandled error:", err);
        if (!res.headersSent) {
          this.sendError(res, 500, "Internal server error");
        }
      });
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        console.log(
          `[OpenAI Server] Listening on http://${this.config.host}:${this.config.port}`
        );
        console.log(`[OpenAI Server] Endpoints:`);
        console.log(`  POST /v1/chat/completions`);
        console.log(`  GET  /v1/models`);
        resolve();
      });
    });
  }

  /** Stop the server */
  async stop(): Promise<void> {
    if (!this.server) return;
    return new Promise((resolve) => {
      this.server!.close(() => resolve());
    });
  }

  /** Main request router */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // Add CORS headers to all responses
    this.setCorsHeaders(res);

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth check
    if (!this.checkAuth(req)) {
      this.sendError(res, 401, "Invalid or missing API key", "invalid_api_key");
      return;
    }

    const url = req.url ?? "";

    // Route: POST /v1/chat/completions
    if (url === "/v1/chat/completions" && req.method === "POST") {
      await this.handleChatCompletions(req, res);
      return;
    }

    // Route: GET /v1/models
    if (url === "/v1/models" && req.method === "GET") {
      this.handleModels(res);
      return;
    }

    // 404 for everything else
    this.sendError(res, 404, `Not found: ${req.method} ${url}`);
  }

  /** Handle POST /v1/chat/completions */
  private async handleChatCompletions(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    let body: OpenAIChatCompletionRequest;
    try {
      const raw = await this.readBody(req);
      body = JSON.parse(raw) as OpenAIChatCompletionRequest;
    } catch {
      this.sendError(res, 400, "Invalid JSON in request body");
      return;
    }

    // Validate model
    if (!body.model || !this.service.isValidModel(body.model)) {
      const models = this.service
        .getModels()
        .map((m) => m.id)
        .join(", ");
      this.sendError(
        res,
        400,
        `Unknown model: ${body.model}. Available models: ${models}`,
        "model_not_found"
      );
      return;
    }

    // Validate messages
    if (!body.messages || !Array.isArray(body.messages)) {
      this.sendError(res, 400, "messages is required and must be an array");
      return;
    }

    if (body.stream) {
      await this.handleStreamingResponse(body, res);
    } else {
      await this.handleNonStreamingResponse(body, res);
    }
  }

  /** Handle non-streaming chat completion */
  private async handleNonStreamingResponse(
    request: OpenAIChatCompletionRequest,
    res: ServerResponse
  ): Promise<void> {
    try {
      const content = await this.service.generate(request);
      const completionId = generateCompletionId();
      const created = Math.floor(Date.now() / 1000);

      const response: OpenAIChatCompletionResponse = {
        id: completionId,
        object: "chat.completion",
        created,
        model: request.model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };

      this.sendJson(res, 200, response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generation failed";
      this.sendError(res, 500, message, "generation_error");
    }
  }

  /** Handle streaming chat completion with SSE */
  private async handleStreamingResponse(
    request: OpenAIChatCompletionRequest,
    res: ServerResponse
  ): Promise<void> {
    const completionId = generateCompletionId();
    const created = Math.floor(Date.now() / 1000);

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send role chunk
    const roleChunk: OpenAIChatCompletionChunk = {
      id: completionId,
      object: "chat.completion.chunk",
      created,
      model: request.model,
      choices: [
        {
          index: 0,
          delta: { role: "assistant" },
          finish_reason: null,
        },
      ],
    };
    this.writeSSE(res, roleChunk);

    try {
      const content = await this.service.generate(request);

      // Send content chunk
      const contentChunk: OpenAIChatCompletionChunk = {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: request.model,
        choices: [
          {
            index: 0,
            delta: { content },
            finish_reason: null,
          },
        ],
      };
      this.writeSSE(res, contentChunk);

      // Send finish chunk
      const finishChunk: OpenAIChatCompletionChunk = {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: request.model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: "stop",
          },
        ],
      };
      this.writeSSE(res, finishChunk);
    } catch (err) {
      // Send error as content in the stream
      const message =
        err instanceof Error ? err.message : "Generation failed";
      const errorChunk: OpenAIChatCompletionChunk = {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: request.model,
        choices: [
          {
            index: 0,
            delta: { content: `Error: ${message}` },
            finish_reason: null,
          },
        ],
      };
      this.writeSSE(res, errorChunk);

      const finishChunk: OpenAIChatCompletionChunk = {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: request.model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: "stop",
          },
        ],
      };
      this.writeSSE(res, finishChunk);
    }

    // Send done marker
    res.write("data: [DONE]\n\n");
    res.end();
  }

  /** Handle GET /v1/models */
  private handleModels(res: ServerResponse): void {
    const models = this.service.getModels();
    this.sendJson(res, 200, { object: "list", data: models });
  }

  /** Read the full request body as a string */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }

  /** Check authorization header if apiKey is configured */
  private checkAuth(req: IncomingMessage): boolean {
    if (!this.config.apiKey) return true;

    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    return token === this.config.apiKey;
  }

  /** Set CORS headers */
  private setCorsHeaders(res: ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  /** Write an SSE event */
  private writeSSE(res: ServerResponse, data: unknown): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /** Send a JSON response */
  private sendJson(
    res: ServerResponse,
    statusCode: number,
    data: unknown
  ): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  /** Send an OpenAI-formatted error response */
  private sendError(
    res: ServerResponse,
    statusCode: number,
    message: string,
    type = "invalid_request_error"
  ): void {
    this.sendJson(res, statusCode, {
      error: {
        message,
        type,
        param: null,
        code: null,
      },
    });
  }
}
