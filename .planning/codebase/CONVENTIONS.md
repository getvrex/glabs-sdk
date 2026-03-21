# Conventions

## Code Style

- **Strict TypeScript** — all strict flags enabled, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- **ESM only** — `verbatimModuleSyntax: true`, explicit `type` keyword for type imports
- **No default exports** — all named exports
- **Barrel files** — `index.ts` in each directory re-exports public API
- **Type-only exports** — `export type { ... }` separated from value exports in barrel files

## Naming

- Files: kebab-case with domain suffix (`image.service.ts`, `cmd-videos.ts`)
- Classes: PascalCase (`GLabsClient`, `VideoService`)
- Types/Interfaces: PascalCase (`GenerateImageOptions`, `VideoStatusResult`)
- Constants: UPPER_SNAKE_CASE objects (`ENDPOINTS`, `DEFAULTS`, `ERROR_CODES`)
- Functions: camelCase (`fetchWithRetry`, `parseGoogleApiError`)

## Patterns

### Constructor Injection
Services receive dependencies through options objects:
```typescript
export class VideoService {
  constructor(options: VideoServiceOptions) {
    this.config = options.config;
    this.recaptchaService = options.recaptchaService;
  }
}
```

### Facade Pattern
`GLabsClient` exposes namespaced APIs (`client.images.*`, `client.videos.*`) that delegate to internal services. ProjectId is auto-resolved, token refresh is transparent.

### Options Pattern
All API methods accept a single options object:
```typescript
generate(options: GenerateImageOptions): Promise<GenerateImageResult>
```
Return types are explicit result types (not raw responses).

### Error Handling
- Custom `GLabsError` extends `Error` with `code`, `statusCode`, `cause`
- Error codes defined as const object (`ERROR_CODES`)
- `parseGoogleApiError()` translates Google API errors to user-friendly messages
- `isRecaptchaRequired()` / `isRecaptchaEvaluationFailed()` — specialized error detection
- Network errors auto-retried via `fetchWithRetry()`

### Token Management
- Proactive refresh: checks expiry before each call
- Reactive refresh: catches 401, refreshes, retries once
- `withTokenRefresh(fn)` wrapper on all public API methods

### Tier Configuration
- Single source of truth in `src/config/tier-config.ts`
- Adapter functions translate (tier, mode, aspectRatio) to API-specific parameters
- No conditional tier logic in services — only config lookups

## API Response Handling

- Raw `fetch()` responses parsed in services
- Success: extract relevant data, return typed result
- Error: parse with `parseGoogleApiError()`, throw `GLabsError`
- reCAPTCHA required: detect via status code + error message, retry with token
