# Scout Report: Token Management Infrastructure
**Date:** 2026-02-28  
**Scope:** Authentication & Token Refresh Mechanism

## 1. Project Overview

**Project:** @getvrex/glabs-sdk (TypeScript SDK v2.1.1)  
**Type:** Private npm package for Google Labs AI media generation (Imagen 4, Veo 3)  
**Architecture:** Node.js/Browser-compatible TypeScript with CLI interface

### Key Dependencies
- **Runtime:** chrome-remote-interface (^0.34.0)
- **Dev:** playwright (^1.58.2 optional peer), typescript (^5), tsup, dotenv
- **No external auth libs** — token management is custom-built

---

## 2. Current Token Management Architecture

### 2.1 Token Types & Flow
**Two-Token System:**
1. **Bearer Token** (Access Token)
   - Google Labs API authentication token
   - Set in `Authorization: Bearer <token>` header
   - Expires periodically (3h+ default)
   - **Can be auto-refreshed via session token**

2. **Session Token** (Optional)
   - `__Secure-next-auth.session-token` cookie value
   - Used for ST→AT (Session Token → Access Token) conversion
   - Enables automatic token refresh without user intervention

### 2.2 Token Manager Implementation
**File:** `/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts`

**Key Features:**
- Automatic proactive refresh (1 hour before expiry)
- Concurrent refresh deduplication (prevents duplicate requests)
- 401 retry mechanism in client
- Endpoint: `https://labs.google/fx/api/auth/session`
- No persistent storage of tokens (in-memory only)

**Methods:**
```typescript
ensureValid(): Promise<void>        // Auto-refresh if needed
forceRefresh(): Promise<void>       // Force immediate refresh
needsRefresh(): boolean              // Check if refresh needed
doRefresh(): Promise<void>          // Perform ST→AT call
```

---

## 3. Full Directory Structure

```
src/
├── client.ts                      # Main GLabsClient class
├── openai-server.ts              # OpenAI-compatible server
├── index.ts                       # Public exports
│
├── cli/                           # Command-line interface
│   ├── cli-entry.ts              # Entry point
│   ├── cli-client.ts             # CLI client setup
│   ├── cli-config.ts             # Config management
│   ├── cli-output.ts             # Output formatting
│   ├── cmd-images.ts             # Image commands
│   ├── cmd-videos.ts             # Video commands
│   ├── cmd-projects.ts           # Project commands
│   ├── cmd-config.ts             # Config commands
│   ├── cmd-whisk.ts              # Whisk commands
│   └── cmd-serve.ts              # OpenAI server
│
├── services/                      # Core business logic
│   ├── token-manager.ts          # ⭐ Token refresh (ST→AT)
│   ├── image.service.ts          # Image generation
│   ├── video.service.ts          # Video generation
│   ├── project.service.ts        # Project management
│   ├── recaptcha.service.ts      # reCAPTCHA orchestration
│   ├── chrome-recaptcha.service.ts  # Chrome-based solver
│   ├── playwright-recaptcha.service.ts # Playwright-based solver
│   ├── whisk.service.ts          # Whisk API (Imagen 3.5)
│   ├── openai-compat.service.ts  # OpenAI compatibility
│   └── index.ts                  # Service exports
│
├── types/                         # TypeScript type definitions
│   ├── client.ts                 # GLabsClientConfig, ResolvedConfig
│   ├── common.ts                 # Shared types (AccountTier, etc.)
│   ├── image.ts                  # Image-related types
│   ├── video.ts                  # Video-related types
│   ├── project.ts                # Project types
│   ├── recaptcha.ts              # reCAPTCHA config types
│   ├── tier.ts                   # Account tier utilities
│   ├── openai-compat.ts          # OpenAI compatibility types
│   └── index.ts                  # Type exports
│
├── config/                        # Configuration
│   ├── index.ts                  # Config utils
│   └── tier-config.ts            # Account tier config
│
├── utils/                         # Utilities
│   ├── fetch.ts                  # HTTP with retry + auth headers
│   ├── errors.ts                 # Error parsing & classification
│   └── index.ts                  # Utils exports
│
└── constants.ts                  # API endpoints, defaults, error codes
```

---

## 4. Authentication Infrastructure

### 4.1 Type Definitions
**File:** `/Users/quocs/Projects/glabs-sdk/src/types/client.ts`

```typescript
type GLabsClientConfig = {
  bearerToken: string;           // Required
  sessionToken?: string;         // For auto-refresh (ST→AT)
  accountTier?: AccountTier;     // 'pro' | 'ultra'
  projectId?: string;            // Optional default
  recaptcha?: RecaptchaConfig;   // reCAPTCHA config
  timeout?: number;              // Default: 120000ms
  maxRetries?: number;           // Default: 2
  retryDelay?: number;           // Default: 1500ms
  logger?: GLabsLogger;          // Custom logger
};

type ResolvedConfig = {
  bearerToken: string;           // Mutable (updated during refresh)
  sessionToken?: string;
  accountTier: AccountTier;
  projectId?: string;
  recaptcha?: RecaptchaConfig;
  logger: GLabsLogger;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
};
```

### 4.2 HTTP Headers & Authorization
**File:** `/Users/quocs/Projects/glabs-sdk/src/utils/fetch.ts`

**Header Building Functions:**
```typescript
buildHeaders(bearerToken: string, additionalHeaders?: Record<string, string>)
buildHeadersWithFingerprint(bearerToken: string, fingerprint?: {...})
```

**Default Headers (all requests):**
```
Content-Type: application/json
Origin: https://labs.google
Referer: https://labs.google/
Authorization: Bearer <bearerToken>
```

**For reCAPTCHA flows:** User-Agent & sec-ch-ua headers injected from fingerprint

### 4.3 Token Refresh Flow (ST→AT)
**Location:** `token-manager.ts::doRefresh()`

```
1. Client calls any API (e.g., generateImage)
2. withTokenRefresh() checks if token needs refresh via ensureValid()
3. needsRefresh() checks:
   - No known expiry? → refresh
   - Less than 1h remaining? → refresh
   - Otherwise → use current token
4. doRefresh() makes GET request to:
   https://labs.google/fx/api/auth/session
   Headers: Cookie: __Secure-next-auth.session-token=<sessionToken>
5. Response: { access_token, expires, user: { email, name }, error? }
6. Update config.bearerToken in-place
7. Set tokenExpiry based on response.expires (default 3h if not provided)
8. Log refresh with user email & minutes remaining
```

### 4.4 401 Retry Mechanism
**Location:** `client.ts::withTokenRefresh()`

```
1. Execute API call
2. On error, check if:
   - sessionToken configured?
   - Error is 401 (Unauthorized)?
3. If yes: forceRefresh() → retry API call once
4. If no: throw error
```

---

## 5. Environment Configuration

### 5.1 .env.example
**Location:** `/Users/quocs/Projects/glabs-sdk/.env.example`

```
GLABS_BEARER_TOKEN=
GLABS_PROJECT_ID=
RECAPTCHA_API_KEY=
RECAPTCHA_PROVIDER=
```

### 5.2 Current .env (Production Test)
**Location:** `/Users/quocs/Projects/glabs-sdk/.env`

Contains:
- ✅ GLABS_BEARER_TOKEN (ya29.a0ATk... — Google OAuth token)
- ✅ GLABS_SESSION_TOKEN (eyJhbGc... — JWT session token)
- ✅ GLABS_PROJECT_ID (8646509b-... — UUID)
- ✅ RECAPTCHA_API_KEY & REGOTCHA_API_KEY
- ✅ RECAPTCHA_PROVIDER=playwright

---

## 6. API Endpoints & Token Usage

### 6.1 Endpoints Using Bearer Token
**File:** `/Users/quocs/Projects/glabs-sdk/src/constants.ts`

```typescript
ENDPOINTS = {
  // Image
  UPLOAD_IMAGE: https://aisandbox-pa.googleapis.com/v1:uploadUserImage
  BATCH_GENERATE_IMAGES: /v1/projects/{projectId}/flowMedia:batchGenerateImages
  
  // Video
  TEXT_TO_VIDEO: /v1/video:batchAsyncGenerateVideoText
  IMAGE_TO_VIDEO_START: /v1/video:batchAsyncGenerateVideoStartImage
  EXTEND_VIDEO: /v1/video:batchAsyncGenerateVideoExtendVideo
  CHECK_VIDEO_STATUS: /v1/video:batchCheckAsyncVideoGenerationStatus
  
  // Projects (tRPC)
  SEARCH_USER_PROJECTS: https://labs.google/fx/api/trpc/project.searchUserProjects
  GET_PROJECT: https://labs.google/fx/api/trpc/project.getProject
}

SESSION_ENDPOINT = https://labs.google/fx/api/auth/session
```

All endpoints use `Authorization: Bearer <bearerToken>` header except session endpoint (uses Cookie).

---

## 7. Error Handling & Auth Errors

### 7.1 Auth-Related Error Codes
**File:** `/Users/quocs/Projects/glabs-sdk/src/utils/errors.ts` & `constants.ts`

```typescript
ERROR_CODES = {
  NETWORK_ERROR,
  PERMISSION_DENIED,      // 403 errors
  RECAPTCHA_REQUIRED,     // 403 with captcha
  INTERNAL_ERROR,
  INVALID_ARGUMENT,
  TIMEOUT,
  UNKNOWN,
};
```

**Custom `GLabsError` class:**
```typescript
new GLabsError(message, code, statusCode?, cause?)
```

### 7.2 Auth-Specific Errors in TokenManager
- **"Cannot refresh token: no sessionToken configured"** — requires session token
- **"Session refresh failed: {status} {statusText}"** — HTTP error on ST→AT call
- **"Session cookie expired or invalid"** — response.error field set (e.g., "ACCESS_TOKEN_REFRESH_NEEDED")
- **"No access_token in session response"** — response missing token

---

## 8. Client Integration

### 8.1 Main Client Class
**File:** `/Users/quocs/Projects/glabs-sdk/src/client.ts`

**Key Methods:**
```typescript
constructor(config: GLabsClientConfig)
  // Initializes TokenManager, services, resolves config

async refreshToken(): Promise<void>
  // Manually force token refresh (delegates to TokenManager.forceRefresh)

private async withTokenRefresh<T>(fn: () => Promise<T>): Promise<T>
  // Wraps all API calls:
  // 1. ensureValid() — auto-refresh if needed
  // 2. Execute fn()
  // 3. On 401, forceRefresh() + retry once
```

**Service Integration:**
```typescript
this.tokenManager = new TokenManager(this.config)
this.imageService = new ImageService({ config, recaptchaService })
this.videoService = new VideoService({ config, recaptchaService })
this.projectService = new ProjectService({ config })
```

### 8.2 Service Layer
**All services receive:**
```typescript
config: ResolvedConfig  // Contains mutable bearerToken
recaptchaService?: RecaptchaService  // For generation endpoints
```

**Usage in services:**
```typescript
// E.g., in image.service.ts
const headers = buildHeaders(this.config.bearerToken, additionalHeaders);
const response = await fetchWithRetry(endpoint, {
  method: 'POST',
  headers,
  body: JSON.stringify(payload),
  ...retryConfig
});
```

---

## 9. Token Extraction Feature: Integration Points

### Where New Token Extraction Would Fit

**Option 1: Add to TokenManager** (Recommended)
- New method: `getTokenInfo(): { token: string; expiresIn?: number; email?: string }`
- Leverage existing SessionResponse type
- Can be exposed via client: `client.getTokenInfo()`

**Option 2: Add to Client directly**
- New method: `async extractToken(): Promise<{ accessToken: string; expiresAt?: Date; user?: { email: string } }>`
- Delegates to TokenManager

**Option 3: Standalone utility**
- New file: `src/services/token-extractor.ts`
- Independent of client lifecycle
- Can work with just sessionToken

### Recommended Integration Point
```typescript
// In TokenManager.ts
async extractAccessToken(): Promise<{
  accessToken: string;
  expiresAt?: Date;
  user?: { email: string; name: string };
}> {
  // Reuse doRefresh() logic OR create helper
  // Return token + metadata without updating config
}

// In Client.ts
async extractToken(): Promise<{
  accessToken: string;
  expiresAt?: Date;
  user?: { email: string; name: string };
}> {
  return this.tokenManager.extractAccessToken();
}
```

---

## 10. File Index for Token/Auth Implementation

### Primary Files
- **Token Management:** `/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts` (150 lines)
- **Client Integration:** `/Users/quocs/Projects/glabs-sdk/src/client.ts` (446 lines)
- **HTTP Utils:** `/Users/quocs/Projects/glabs-sdk/src/utils/fetch.ts` (117 lines)
- **Error Handling:** `/Users/quocs/Projects/glabs-sdk/src/utils/errors.ts` (186 lines)
- **Types:** `/Users/quocs/Projects/glabs-sdk/src/types/client.ts` (55 lines)

### Supporting Files
- **Constants:** `/Users/quocs/Projects/glabs-sdk/src/constants.ts` (86 lines)
- **Services Index:** `/Users/quocs/Projects/glabs-sdk/src/services/index.ts` (27 lines)
- **Public Types:** `/Users/quocs/Projects/glabs-sdk/src/types/index.ts`
- **Package Config:** `/Users/quocs/Projects/glabs-sdk/package.json` (75 lines)

### Configuration Files
- **Env Example:** `/Users/quocs/Projects/glabs-sdk/.env.example`
- **Env Live:** `/Users/quocs/Projects/glabs-sdk/.env`
- **Readme:** `/Users/quocs/Projects/glabs-sdk/README.md` (226 lines)

---

## 11. Summary & Recommendations

### Current State
✅ **Complete token refresh mechanism** (ST→AT conversion)  
✅ **Proactive refresh strategy** (1h threshold)  
✅ **Concurrent request deduplication**  
✅ **401 retry mechanism** (refresh + retry once)  
✅ **In-memory token management**  
✅ **Error classification** for auth failures  

### For Token Extraction Feature
1. **Add `extractAccessToken()` to TokenManager** — returns token without modifying state
2. **Expose via Client** — `client.extractToken()` for public API
3. **Handle error cases** — missing sessionToken, expired session, network errors
4. **Optional:** Cache extracted token with short TTL if frequent extraction expected
5. **Document in:** `docs/token-management.mdx` (already exists per README)

### No External Auth Dependencies
- This SDK implements all token management internally
- Uses only standard `fetch()` API + chrome-remote-interface
- No OAuth2, JWT, or passport-like frameworks
- Direct HTTP calls to Google Labs auth endpoint

---

## Unresolved Questions

None at this time. Architecture is clear and documented.

