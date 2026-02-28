# GLabs SDK

TypeScript SDK and CLI for Google Labs AI media generation — **Imagen 4** image generation and **Veo 3** video generation.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@getvrex/glabs-sdk`](https://www.npmjs.com/package/@getvrex/glabs-sdk) | SDK for programmatic usage | `npm install @getvrex/glabs-sdk` |
| [`@getvrex/glabs-cli`](https://www.npmjs.com/package/@getvrex/glabs-cli) | Global CLI | `npm install -g @getvrex/glabs-cli` |

## CLI

```bash
npm install -g @getvrex/glabs-cli
```

```
glabs <command> [subcommand] [options]

Commands:
  auth      extract             Extract tokens via browser automation
  config    show | set          Manage CLI configuration
  projects  list | get          Manage projects
  images    generate | upload | upsample | credits
  videos    generate | i2v | r2v | extend | reshoot | upsample | status | poll
  whisk     generate            Whisk image generation (Imagen 3.5)
  serve                         Start OpenAI-compatible server
```

### Setup

```bash
# Extract tokens automatically
glabs auth extract --email user@gmail.com --password "pass" --save

# Or set tokens manually
glabs config set --bearer-token "tok" --session-token "stok" --account-tier pro
```

### Usage Examples

```bash
# Generate images
glabs images generate -p "A sunset over mountains" -a 16:9 -n 4

# Generate video from text
glabs videos generate -p "A cinematic drone shot of a city" -a 16:9

# Generate video from image
glabs videos i2v -p "Camera pans slowly" --start-media-id "abc123"

# Poll and download video
glabs videos poll --operation-name "operations/xyz" -o ./videos

# Start OpenAI-compatible server
glabs serve --port 8000 --api-key "sk-my-key"
```

## SDK

```bash
npm install @getvrex/glabs-sdk
```

### Quick Start

```typescript
import { GLabsClient } from '@getvrex/glabs-sdk';

const client = new GLabsClient({
  bearerToken: 'your-bearer-token',
  sessionToken: 'your-session-token',
  accountTier: 'pro',
  recaptcha: { provider: 'chrome' },
});

// Generate an image
const image = await client.images.generate({
  prompt: 'A beautiful sunset over mountains',
  sessionId: GLabsClient.generateSessionId(),
  aspectRatio: '16:9',
});

// Generate a video
const operation = await client.videos.generateTextToVideo({
  prompt: 'A cinematic drone shot of a city',
  sessionId: GLabsClient.generateSessionId(),
  aspectRatio: '16:9',
});

// Poll until ready
const video = await client.videos.pollOperation({
  operationName: operation.operationName,
  onProgress: (status, attempt) => console.log(`[${attempt}] ${status.status}`),
});

console.log('Video URL:', video.videoUrl);
await client.close();
```

### Image Generation (Imagen 4)

```typescript
client.images.generate(opts)       // Text-to-image (up to 4 per batch)
client.images.upload(opts)         // Upload for video generation
client.images.upsampleImage(opts)  // Upscale to 2K/4K
client.images.getCreditStatus()    // Check account credits
```

### Video Generation (Veo 3 / 3.1)

```typescript
client.videos.generateTextToVideo(opts)          // Text-to-video
client.videos.generateImageToVideo(opts)          // Image-to-video (start or first+last frame)
client.videos.generateReferenceImagesVideo(opts)  // Multi-reference image video (1-3 images)
client.videos.extend(opts)                        // Extend existing videos
client.videos.reshoot(opts)                       // Camera control reshoot (14 motion types)
client.videos.upsample(opts)                      // Upscale to HD/4K
client.videos.checkStatus(opts)                   // Check generation status
client.videos.pollOperation(opts)                 // Poll until completion
```

### Project Management

```typescript
client.projects.list()              // List projects
client.projects.get({ projectId })  // Get project details
client.projects.getFirstProjectId() // Auto-resolve (cached)
```

All generation methods auto-select the first project if none is provided.

### OpenAI-Compatible Server

```typescript
import { GLabsClient } from '@getvrex/glabs-sdk';
import { OpenAIServer } from '@getvrex/glabs-sdk/openai';

const server = new OpenAIServer(new GLabsClient({ ... }), {
  port: 8000,
  apiKey: 'sk-xxx',
});
await server.start();
// POST /v1/chat/completions
// GET  /v1/models
```

### Whisk (Imagen 3.5)

```typescript
import { WhiskService } from '@getvrex/glabs-sdk';

const whisk = new WhiskService('your-cookie-string');
const result = await whisk.generateImage('A cute robot');
```

## Configuration

```typescript
const client = new GLabsClient({
  bearerToken: string,           // Required: auth token
  sessionToken?: string,         // Auto token refresh (ST -> AT)
  accountTier?: 'pro' | 'ultra', // Default: 'pro'
  projectId?: string,            // Auto-resolved if omitted
  recaptcha?: RecaptchaConfig,   // Required for generation
  timeout?: number,              // Request timeout ms (default: 120000)
  maxRetries?: number,           // Network retries (default: 2)
  retryDelay?: number,           // Retry delay ms (default: 1500)
});
```

### reCAPTCHA Providers

| Provider | Type | Note |
|----------|------|------|
| `chrome` | Browser | **Recommended** — real Chrome, highest scores |
| `yescaptcha` | Cloud | **Recommended** — no local browser needed |
| `playwright` | Browser | Playwright-managed browser |
| `regotcha` | Cloud | Optimized for Google Labs |
| `capsolver` | Cloud | Proxy support |
| `veo3solver` | Token | Pre-solved tokens via JWT |
| `custom` | Self-hosted | Your own solver endpoint |

Fallback chains:

```typescript
recaptcha: {
  provider: 'chrome',
  fallback: { provider: 'yescaptcha', apiKey: 'key' },
}
```

### Token Management

With `sessionToken` configured, the SDK automatically refreshes the bearer token before expiry, retries on 401, and deduplicates concurrent refresh calls.

### Account Tiers

| Feature | Pro | Ultra |
|---------|-----|-------|
| Default Video Mode | fast | quality |
| HD/4K Upscaling | Yes | Yes |
| Max Images/Batch | 4 | 4 |

## Types

```typescript
import type {
  AccountTier, AspectRatio, GenerateImageOptions,
  GenerateTextToVideoOptions, VideoStatusResult,
  RecaptchaConfig, Project, OpenAIServerConfig,
} from '@getvrex/glabs-sdk/types';
```

## Error Handling

```typescript
import { GLabsError } from '@getvrex/glabs-sdk';

try {
  await client.images.generate({ ... });
} catch (error) {
  if (error instanceof GLabsError) {
    console.error(`[${error.code}] ${error.message}`, error.statusCode);
  }
}
```

## Claude Code Skill

Install the `glabs-cli` skill for Claude Code AI assistance:

```bash
curl -fsSL https://raw.githubusercontent.com/getvrex/glabs-sdk/main/scripts/install-skill.sh | bash
```

## Documentation

Full docs: [`docs/`](./docs/)

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.mdx) | Installation and setup |
| [CLI](./docs/cli.mdx) | Command-line interface |
| [Client](./docs/client.mdx) | Client configuration |
| [Image Generation](./docs/image-generation.mdx) | Image API |
| [Video Generation](./docs/video-generation.mdx) | Video API |
| [Project Management](./docs/project-management.mdx) | Project API |
| [reCAPTCHA](./docs/recaptcha.mdx) | reCAPTCHA integration |
| [OpenAI Server](./docs/openai-server.mdx) | OpenAI-compatible server |
| [Token Management](./docs/token-management.mdx) | Auto token refresh |
| [Whisk](./docs/whisk.mdx) | Whisk image generation |
| [Error Handling](./docs/error-handling.mdx) | Error codes |
| [API Reference](./docs/api-reference.mdx) | Complete API reference |

## License

MIT
