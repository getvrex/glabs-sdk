# Testing

## Framework

- **Test runner:** Bun (`bun test`)
- **Import:** `import { describe, it, expect, beforeAll, afterAll } from "bun:test"`
- **No unit test framework** — only E2E tests exist

## Test Structure

```
tests/
└── e2e/
    └── sdk.e2e.test.ts    # Single E2E flow test file
```

## E2E Tests

The only test file (`tests/e2e/sdk.e2e.test.ts`) tests a minimal flow:
1. **T2I** — Text-to-image generation (Imagen 4, nanobanana2 model)
2. **I2I** — Image-to-image using previous result as reference
3. **I2V** — Image-to-video using previous image as start frame

### Requirements
- Environment variables: `GLABS_BEARER_TOKEN`, `RECAPTCHA_API_KEY`
- Optional: `GLABS_SESSION_TOKEN`, `RECAPTCHA_PROVIDER` (defaults to "capsolver")
- Tests auto-skip when credentials missing (`it.skipIf(!hasCredentials)`)
- Timeout: 180s per test (API calls are slow)

### Running
```bash
bun test                           # All tests (skips E2E without creds)
bun test tests/e2e/                # E2E only
RUN_VIDEO_TESTS=true bun test tests/e2e/  # Include video tests
```

## Coverage

- **No unit tests** — only E2E integration tests
- No mocking framework configured
- No coverage reporting tool configured
- Pre-release script: `bun run check-types && bun run test:e2e`

## Gaps

- No unit tests for individual services (ImageService, VideoService, etc.)
- No unit tests for error parsing logic
- No unit tests for tier config resolution
- No mock/stub infrastructure for offline testing
- No CI test pipeline visible in repo
