# Structure

## Directory Layout

```
glabs-sdk/
├── src/                          # Source code
│   ├── index.ts                  # SDK main exports
│   ├── client.ts                 # GLabsClient facade class
│   ├── constants.ts              # API URLs, defaults, error codes
│   ├── openai-server.ts          # OpenAI-compatible HTTP server
│   ├── cli/                      # CLI command handlers
│   │   ├── cli-entry.ts          # CLI entry point (shebang)
│   │   ├── cli-config.ts         # Config file management (~/.glabs)
│   │   ├── cli-client.ts         # Shared client factory for CLI
│   │   ├── cli-output.ts         # Output formatting helpers
│   │   ├── cmd-auth.ts           # glabs auth extract
│   │   ├── cmd-config.ts         # glabs config show/set
│   │   ├── cmd-images.ts         # glabs images generate/upload/upsample
│   │   ├── cmd-videos.ts         # glabs videos generate/i2v/extend/...
│   │   ├── cmd-projects.ts       # glabs projects list/get
│   │   ├── cmd-serve.ts          # glabs serve
│   │   └── cmd-whisk.ts          # glabs whisk generate
│   ├── config/                   # Configuration
│   │   ├── index.ts              # Config re-exports
│   │   └── tier-config.ts        # Tier capabilities (pro/ultra)
│   ├── services/                 # Service implementations
│   │   ├── index.ts              # Service re-exports
│   │   ├── image.service.ts      # Image generation
│   │   ├── video.service.ts      # Video generation + polling
│   │   ├── project.service.ts    # Project management
│   │   ├── recaptcha.service.ts  # reCAPTCHA orchestrator
│   │   ├── chrome-recaptcha.service.ts    # Chrome CDP solver
│   │   ├── playwright-recaptcha.service.ts # Playwright solver
│   │   ├── openai-compat.service.ts       # OpenAI translation
│   │   ├── token-manager.ts      # Token lifecycle
│   │   ├── token-extractor.service.ts     # Browserless extraction
│   │   └── whisk.service.ts      # Whisk image generation
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Type re-exports
│   │   ├── client.ts             # Client config types
│   │   ├── common.ts             # Shared types (AccountTier, AspectRatio, etc.)
│   │   ├── image.ts              # Image operation types
│   │   ├── video.ts              # Video operation types
│   │   ├── recaptcha.ts          # reCAPTCHA provider types
│   │   ├── openai-compat.ts      # OpenAI-compat types
│   │   ├── tier.ts               # Tier config types
│   │   └── project.ts            # Project types
│   └── utils/                    # Utilities
│       ├── index.ts              # Utility re-exports
│       ├── errors.ts             # GLabsError, API error parsing
│       └── fetch.ts              # fetchWithRetry, header builders
├── packages/
│   └── cli/                      # Separate CLI npm package
│       ├── package.json          # @getvrex/glabs-cli
│       └── bin/glabs.js          # Thin wrapper importing SDK CLI entry
├── tests/
│   └── e2e/
│       └── sdk.e2e.test.ts       # E2E flow tests (T2I, I2I, I2V)
├── docs/                         # Documentation
├── plans/                        # Planning documents
├── glabs-docs/                   # External docs reference
├── playground.ts                 # Development playground
├── tsup.config.ts                # Configuration for bundler
├── tsconfig.json                 # TypeScript config
├── release-please-config.json    # Automated releases
└── CHANGELOG.md                  # Release changelog
```

## Naming Conventions

- **Services:** `{domain}.service.ts` (e.g., `image.service.ts`, `video.service.ts`)
- **CLI commands:** `cmd-{command}.ts` (e.g., `cmd-images.ts`, `cmd-videos.ts`)
- **Types:** `{domain}.ts` in `types/` directory
- **Re-exports:** `index.ts` barrel files in each directory
- **Classes:** PascalCase (`GLabsClient`, `VideoService`, `RecaptchaService`)
- **Types:** PascalCase (`AccountTier`, `VideoOperationResult`)
- **Constants:** UPPER_SNAKE_CASE (`GLABS_API_BASE`, `DEFAULTS`)

## Key Locations

| What | Where |
|---|---|
| Public API surface | `src/index.ts` |
| Client facade | `src/client.ts` |
| All API endpoints | `src/constants.ts` |
| Tier logic (pro/ultra) | `src/config/tier-config.ts` |
| Error handling | `src/utils/errors.ts` |
| HTTP layer | `src/utils/fetch.ts` |
| E2E tests | `tests/e2e/sdk.e2e.test.ts` |
| Bundler config | `tsup.config.ts` |
