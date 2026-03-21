# Architecture

## Pattern

**Layered service architecture** with a facade client pattern.

```
GLabsClient (facade)
  ├── TokenManager (auth lifecycle)
  ├── RecaptchaService (captcha solving, delegates to provider impls)
  ├── ImageService (image gen/upload/upsample)
  ├── VideoService (video gen/status/poll)
  ├── ProjectService (project CRUD)
  └── OpenAICompatService (request translation)
```

## Layers

1. **Client Layer** (`src/client.ts`) — Public facade. Exposes `images.*`, `videos.*`, `projects.*` namespaces. Handles projectId resolution, token refresh wrapping.

2. **Service Layer** (`src/services/`) — Business logic. Each service handles one domain (image, video, project, recaptcha, token, openai-compat). Services receive `ResolvedConfig` and dependencies via constructor injection.

3. **Config Layer** (`src/config/tier-config.ts`) — Single source of truth for tier-based capabilities. Maps account tier (pro/ultra) × video mode (quality/fast) × aspect ratio to model keys, paygate tiers, and API parameters.

4. **Type Layer** (`src/types/`) — Pure type definitions. Separate files per domain: `client.ts`, `common.ts`, `image.ts`, `video.ts`, `recaptcha.ts`, `openai-compat.ts`, `tier.ts`, `project.ts`.

5. **Utility Layer** (`src/utils/`) — Cross-cutting: error handling (`errors.ts`), HTTP with retry (`fetch.ts`).

6. **CLI Layer** (`src/cli/`) — Command handlers. Each command in its own file (`cmd-*.ts`). Shared config/client factories in `cli-config.ts`, `cli-client.ts`.

## Data Flow

### Image Generation
```
User → GLabsClient.images.generate()
  → resolveProjectId() (auto-fetch if needed)
  → withTokenRefresh() wrapper
    → ImageService.generateImage()
      → RecaptchaService.getToken() (if configured)
      → fetchWithRetry() → Google Labs API
      → parse response → GenerateImageResult
```

### Video Generation
```
User → GLabsClient.videos.generateTextToVideo()
  → resolveProjectId() + withTokenRefresh()
    → VideoService.generateTextToVideo()
      → executeWithRecaptchaRetry() loop
        → RecaptchaService.getToken()
        → fetchWithRetry() → Google Labs API
      → VideoOperationResult (operation name)

User → GLabsClient.videos.pollOperation()
  → VideoService.pollOperation()
    → loop: checkStatus() until complete/failed/timeout
    → VideoStatusResult (with video URL)
```

## Key Abstractions

- **`withTokenRefresh(fn)`** — Wraps any API call. Ensures valid token before call, retries once on 401 with fresh token.
- **`executeWithRecaptchaRetry()`** — Video-specific. Retries with fresh reCAPTCHA token on evaluation failure (up to 20 retries).
- **`fetchWithRetry()`** — Network-level retry on transient errors (timeout, ECONNREFUSED, etc).
- **Tier config adapters** — `getVideoApiConfig()`, `getImageApiConfig()` translate (tier, mode, aspectRatio) → API parameters.

## Entry Points

| Entry | File | Purpose |
|---|---|---|
| SDK | `src/index.ts` | Library exports (GLabsClient, services, types) |
| CLI | `src/cli/cli-entry.ts` | CLI binary (`glabs` command) |
| OpenAI server | `src/openai-server.ts` | OpenAI-compat HTTP server |
| Types only | `src/types/index.ts` | Type-only imports |
