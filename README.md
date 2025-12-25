# @getvrex/glabs-sdk

TypeScript SDK for Google Labs AI media generation APIs (Imagen, Veo).

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
  bearerToken: 'your-token',
  accountTier: 'pro',
  // projectId is optional - auto-selects first available project if not provided
  recaptcha: {
    provider: 'regotcha', // Recommended: regotcha or capsolver
    apiKey: 'your-api-key',
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

// Check video status
const status = await client.videos.checkStatus({
  operationName: operation.operationName,
});
```

## Features

### Project Management

- `client.projects.list()` - List user projects with pagination
- `client.projects.get({ projectId })` - Get specific project details
- `client.projects.getFirstProjectId()` - Get first available project (cached)
- **Auto-resolution**: All generation methods auto-select first project if none provided

### Image Generation

- `client.images.generate()` - Generate images from text prompts
- `client.images.upload()` - Upload images for video generation
- `client.images.getCreditStatus()` - Check account credits

### Video Generation

- `client.videos.generateTextToVideo()` - Text-to-video generation
- `client.videos.generateImageToVideo()` - Image-to-video (first/last frame)
- `client.videos.generateReferenceImagesVideo()` - Multi-reference image video
- `client.videos.extend()` - Extend existing videos
- `client.videos.reshoot()` - Camera control reshoot
- `client.videos.upsample()` - Upscale to HD (1080p)
- `client.videos.checkStatus()` - Check generation status

## Configuration

```typescript
interface GLabsClientConfig {
  bearerToken: string;           // Required: Auth token
  accountTier?: AccountTier;     // 'free' | 'pro' | 'ultra' (default: 'pro')
  projectId?: string;            // Default project ID
  recaptcha?: RecaptchaConfig;   // reCAPTCHA config for rate limiting
  timeout?: number;              // Request timeout (default: 30000)
  maxRetries?: number;           // Max retries (default: 3)
  retryDelay?: number;           // Retry delay ms (default: 1000)
  logger?: GLabsLogger;          // Custom logger
}
```

## Account Tiers

| Tier | Image Models | Video Features |
|------|--------------|----------------|
| `free` | Imagen 3 | Basic text-to-video |
| `pro` | Imagen 3 | Full features, Veo 2 |
| `ultra` | Imagen 3 | Full features, Veo 3 |

## Types

Import types for TypeScript support:

```typescript
import type {
  AccountTier,
  AspectRatio,
  GenerateImageOptions,
  GenerateTextToVideoOptions,
  VideoStatusResult,
  // Project types
  Project,
  ListProjectsOptions,
  ListProjectsResult,
} from '@getvrex/glabs-sdk/types';
```

## Error Handling

```typescript
import { GLabsError } from '@getvrex/glabs-sdk';

try {
  await client.images.generate({ ... });
} catch (error) {
  if (error instanceof GLabsError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status: ${error.status}`);
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
| [reCAPTCHA](./docs/recaptcha.mdx) | reCAPTCHA integration |
| [Tier Config](./docs/tier-config.mdx) | Account tier utilities |
| [API Reference](./docs/api-reference.mdx) | Complete API reference |

## License

MIT
