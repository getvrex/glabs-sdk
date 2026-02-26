# @getvrex/glabs-sdk

TypeScript SDK for Google Labs AI media generation APIs (Imagen 4, Veo 3).

## Installation

```bash
npm install @getvrex/glabs-sdk
```

**Note:** This is a private package. Configure your `.npmrc`:

```
@getvrex:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Quick Start

```typescript
import { GLabsClient } from '@getvrex/glabs-sdk';

const client = new GLabsClient({
  bearerToken: 'your-bearer-token',
  sessionToken: 'your-session-token',  // enables auto token refresh (ST→AT)
  accountTier: 'pro',
  recaptcha: {
    provider: 'chrome',  // recommended: chrome or yescaptcha
  },
});

// Generate an image (auto-selects project if not specified)
const result = await client.images.generate({
  prompt: 'A beautiful sunset over mountains',
  sessionId: GLabsClient.generateSessionId(),
  aspectRatio: '16:9',
});

// Generate a video from text
const operation = await client.videos.generateTextToVideo({
  prompt: 'A cinematic drone shot of a city',
  sessionId: GLabsClient.generateSessionId(),
  aspectRatio: '16:9',
});

// Poll until video is ready
const video = await client.videos.pollOperation({
  operationName: operation.operationName,
  onProgress: (status, attempt) => console.log(`[${attempt}] ${status.status}`),
});

console.log('Video URL:', video.videoUrl);

// Clean up browser resources when done
await client.close();
```

## Features

### Project Management

- `client.projects.list()` — List user projects with pagination
- `client.projects.get({ projectId })` — Get specific project details
- `client.projects.getFirstProjectId()` — Get first available project (cached)
- **Auto-resolution** — All generation methods auto-select first project if none provided

### Image Generation

- `client.images.generate()` — Generate images from text (Imagen 4, up to 4 per batch)
- `client.images.upload()` — Upload images for video generation
- `client.images.upsampleImage()` — Upscale images to 2K/4K
- `client.images.getCreditStatus()` — Check account credits

### Video Generation

- `client.videos.generateTextToVideo()` — Text-to-video (Veo 3.1)
- `client.videos.generateImageToVideo()` — Image-to-video (start frame or first+last frame)
- `client.videos.generateReferenceImagesVideo()` — Multi-reference image video (1-3 images)
- `client.videos.extend()` — Extend existing videos
- `client.videos.reshoot()` — Camera control reshoot (14 motion types)
- `client.videos.upsample()` — Upscale to HD/4K
- `client.videos.checkStatus()` — Check generation status
- `client.videos.pollOperation()` — Poll until completion with progress callbacks

### OpenAI-Compatible Server

```typescript
import { GLabsClient } from '@getvrex/glabs-sdk';
import { OpenAIServer } from '@getvrex/glabs-sdk/openai';

const client = new GLabsClient({ ... });
const server = new OpenAIServer(client, { port: 8000, apiKey: 'sk-xxx' });
await server.start();
// POST /v1/chat/completions
// GET  /v1/models
```

### Whisk Service

Standalone Imagen 3.5 generation via Google Whisk API:

```typescript
import { WhiskService } from '@getvrex/glabs-sdk';

const whisk = new WhiskService('your-cookie-string');
const result = await whisk.generateImage('A cute robot');
```

## Configuration

```typescript
type GLabsClientConfig = {
  bearerToken: string;           // Required: auth token for APIs
  sessionToken?: string;         // Session token for auto token refresh (ST→AT)
  accountTier?: AccountTier;     // 'pro' | 'ultra' (default: 'pro')
  projectId?: string;            // Default project ID (auto-resolved if omitted)
  recaptcha?: RecaptchaConfig;   // reCAPTCHA config (required for generation)
  timeout?: number;              // Request timeout ms (default: 120000)
  maxRetries?: number;           // Network error retries (default: 2)
  retryDelay?: number;           // Retry delay ms (default: 1500)
  logger?: GLabsLogger;          // Custom logger (default: console)
};
```

## Account Tiers

| Feature | Pro | Ultra |
|---------|-----|-------|
| Default Video Mode | fast | quality |
| Video Modes | quality, fast | quality, fast |
| HD/4K Upscaling | Yes | Yes |
| Max Images Per Batch | 4 | 4 |
| Ultra Models | No | Yes (fast mode) |

## reCAPTCHA Providers

| Provider | Type | Key Feature |
|----------|------|-------------|
| `chrome` | Browser | **Recommended** — real Chrome, persistent context, highest scores |
| `yescaptcha` | Cloud | **Recommended** — reliable, no local browser needed |
| `playwright` | Browser | Playwright-managed browser |
| `regotcha` | Cloud | Optimized for Google Labs |
| `capsolver` | Cloud | Proxy support, browser fingerprinting |
| `veo3solver` | Token | Pre-solved tokens via JWT |
| `custom` | Self-hosted | Your own solver endpoint |

Fallback chains are supported:

```typescript
recaptcha: {
  provider: 'chrome',
  fallback: {
    provider: 'yescaptcha',
    apiKey: 'key',
  },
}
```

## Token Management

With `sessionToken` configured, the SDK automatically:
- Refreshes bearer token 1 hour before expiry
- Retries once on 401 after refreshing
- Deduplicates concurrent refresh calls

```typescript
// Manual refresh
await client.refreshToken();
```

## Types

Import types for TypeScript support:

```typescript
import type {
  AccountTier,
  AspectRatio,
  GenerateImageOptions,
  GenerateTextToVideoOptions,
  VideoStatusResult,
  RecaptchaConfig,
  Project,
  OpenAIServerConfig,
} from '@getvrex/glabs-sdk/types';
```

## Error Handling

```typescript
import { GLabsError } from '@getvrex/glabs-sdk';

try {
  await client.images.generate({ ... });
} catch (error) {
  if (error instanceof GLabsError) {
    console.error(`[${error.code}] ${error.message}`);
    console.error('HTTP Status:', error.statusCode);
  }
}
```

## Documentation

Full documentation available in [`docs/`](./docs/):

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.mdx) | Installation and setup |
| [Client](./docs/client.mdx) | Client configuration |
| [Image Generation](./docs/image-generation.mdx) | Image API reference |
| [Video Generation](./docs/video-generation.mdx) | Video API reference |
| [Project Management](./docs/project-management.mdx) | Project API reference |
| [reCAPTCHA](./docs/recaptcha.mdx) | reCAPTCHA integration |
| [OpenAI Server](./docs/openai-server.mdx) | OpenAI-compatible server |
| [Tier Config](./docs/tier-config.mdx) | Account tier utilities |
| [Token Management](./docs/token-management.mdx) | Auto token refresh |
| [Whisk](./docs/whisk.mdx) | Whisk image generation |
| [Error Handling](./docs/error-handling.mdx) | Error codes and handling |
| [API Reference](./docs/api-reference.mdx) | Complete API reference |

## License

MIT
