# File Inventory: Token Management & Auth Infrastructure

## 1. Full src/ Directory Structure

### All Files in src/

```
38 total files across:
- 1 root client file
- 1 openai server file
- 1 public exports file
- 10 CLI files
- 9 service files
- 9 type definition files
- 2 config files
- 3 utility files
- 1 constants file
```

### Complete File List

**Root Level:**
- `/Users/quocs/Projects/glabs-sdk/src/client.ts` (446 lines)
- `/Users/quocs/Projects/glabs-sdk/src/openai-server.ts`
- `/Users/quocs/Projects/glabs-sdk/src/index.ts`

**CLI (10 files):**
- `/Users/quocs/Projects/glabs-sdk/src/cli/cli-entry.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cli-client.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cli-config.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cli-output.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cmd-config.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cmd-images.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cmd-videos.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cmd-projects.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cmd-whisk.ts`
- `/Users/quocs/Projects/glabs-sdk/src/cli/cmd-serve.ts`

**Services (9 files):**
- `/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts` (150 lines) ⭐⭐⭐
- `/Users/quocs/Projects/glabs-sdk/src/services/image.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/video.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/project.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/recaptcha.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/chrome-recaptcha.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/playwright-recaptcha.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/whisk.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/openai-compat.service.ts`
- `/Users/quocs/Projects/glabs-sdk/src/services/index.ts` (27 lines)

**Types (9 files):**
- `/Users/quocs/Projects/glabs-sdk/src/types/client.ts` (55 lines) ⭐
- `/Users/quocs/Projects/glabs-sdk/src/types/common.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/image.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/video.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/project.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/recaptcha.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/tier.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/openai-compat.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/index.ts`

**Config (2 files):**
- `/Users/quocs/Projects/glabs-sdk/src/config/index.ts`
- `/Users/quocs/Projects/glabs-sdk/src/config/tier-config.ts`

**Utils (3 files):**
- `/Users/quocs/Projects/glabs-sdk/src/utils/fetch.ts` (117 lines) ⭐
- `/Users/quocs/Projects/glabs-sdk/src/utils/errors.ts` (186 lines) ⭐
- `/Users/quocs/Projects/glabs-sdk/src/utils/index.ts`

**Root Constants:**
- `/Users/quocs/Projects/glabs-sdk/src/constants.ts` (86 lines) ⭐

---

## 2. Token Management & Auth Related Files

### Primary Token/Auth Files

**Must Read First:**
1. `/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts`
   - ST→AT conversion logic
   - Refresh strategies (proactive, reactive, deduplication)
   - Error handling

2. `/Users/quocs/Projects/glabs-sdk/src/client.ts`
   - TokenManager initialization
   - withTokenRefresh() wrapper for all APIs
   - 401 retry mechanism

3. `/Users/quocs/Projects/glabs-sdk/src/types/client.ts`
   - GLabsClientConfig (input config with sessionToken)
   - ResolvedConfig (internal mutable config)
   - GLabsLogger interface

4. `/Users/quocs/Projects/glabs-sdk/src/utils/fetch.ts`
   - buildHeaders() with Authorization
   - buildHeadersWithFingerprint() for reCAPTCHA
   - fetchWithRetry() with network error handling

5. `/Users/quocs/Projects/glabs-sdk/src/utils/errors.ts`
   - GLabsError class with code + statusCode
   - Auth-specific error parsers
   - isRecaptchaRequired(), isRecaptchaEvaluationFailed()

6. `/Users/quocs/Projects/glabs-sdk/src/constants.ts`
   - SESSION_ENDPOINT = https://labs.google/fx/api/auth/session
   - GLABS_API_BASE endpoints
   - DEFAULT_HEADERS with Origin/Referer
   - ERROR_CODES for auth failures

### Supporting Auth Files

7. `/Users/quocs/Projects/glabs-sdk/src/services/index.ts`
   - Exports TokenManager

8. `/Users/quocs/Projects/glabs-sdk/src/services/image.service.ts`
   - Uses config.bearerToken + buildHeaders()
   - Image generation endpoints

9. `/Users/quocs/Projects/glabs-sdk/src/services/video.service.ts`
   - Uses config.bearerToken + buildHeaders()
   - Video generation endpoints

10. `/Users/quocs/Projects/glabs-sdk/src/services/project.service.ts`
    - Uses config.bearerToken for project API
    - tRPC endpoints

11. `/Users/quocs/Projects/glabs-sdk/src/services/recaptcha.service.ts`
    - reCAPTCHA token generation for 403 responses
    - Part of auth flow

---

## 3. Current Token & Config Files

### Environment Files

- `/Users/quocs/Projects/glabs-sdk/.env.example`
  ```
  GLABS_BEARER_TOKEN=
  GLABS_PROJECT_ID=
  RECAPTCHA_API_KEY=
  RECAPTCHA_PROVIDER=
  ```

- `/Users/quocs/Projects/glabs-sdk/.env` (Live)
  ```
  GLABS_BEARER_TOKEN=ya29.a0ATkoCc6...
  GLABS_SESSION_TOKEN=eyJhbGc...
  GLABS_PROJECT_ID=8646509b-fdd4-...
  RECAPTCHA_API_KEY=rg_live_...
  REGOTCHA_API_KEY=rg_live_...
  RECAPTCHA_PROVIDER=playwright
  ```

### Package Configuration

- `/Users/quocs/Projects/glabs-sdk/package.json` (75 lines)
  ```json
  {
    "name": "@getvrex/glabs-sdk",
    "version": "2.1.1",
    "type": "module",
    "dependencies": {
      "chrome-remote-interface": "^0.34.0"
    },
    "peerDependencies": {
      "playwright": "" (optional)
    }
  }
  ```

### Documentation

- `/Users/quocs/Projects/glabs-sdk/README.md` (226 lines)
  - Token Management section
  - Links to docs/token-management.mdx

---

## 4. Architecture Summary

### Token Management Flow

```
GLabsClientConfig (input)
├── bearerToken: string
├── sessionToken?: string (for ST→AT)
└── ...other config

        ↓

Client Constructor
├── this.config = ResolvedConfig (mutable bearerToken)
├── this.tokenManager = new TokenManager(config)
└── this.imageService = new ImageService({ config, ... })

        ↓

API Call: client.images.generate()
├── withTokenRefresh() wrapper
│   ├── tokenManager.ensureValid()
│   │   ├── needsRefresh()? Check expiry
│   │   └── doRefresh() if needed
│   │       └── GET https://labs.google/fx/api/auth/session
│   │           → Response: { access_token, expires, ... }
│   │           → Update config.bearerToken
│   ├── Execute API call
│   │   ├── buildHeaders(config.bearerToken)
│   │   └── fetchWithRetry() with Authorization header
│   └── On 401: forceRefresh() + retry once

        ↓

Google Labs API Response
├── Status 200: Return result
├── Status 401: Refresh + retry (if sessionToken)
└── Status 403: Check if reCAPTCHA needed
```

### Key Integration Points

1. **Token Refresh:** TokenManager.doRefresh()
2. **Header Building:** buildHeaders() + buildHeadersWithFingerprint()
3. **Error Handling:** GLabsError classification
4. **Retry Logic:** fetchWithRetry() + withTokenRefresh()
5. **Config Access:** All services receive ResolvedConfig

---

## 5. File Statistics

| Category | Files | Lines | Notes |
|----------|-------|-------|-------|
| Token/Auth Primary | 6 | ~839 | Must-read for implementation |
| Services (all) | 9 | ~2000 | Use config.bearerToken |
| Types | 9 | ~500 | Define interfaces |
| CLI | 10 | ~1500 | Use client for auth |
| Utils | 3 | ~303 | Headers, errors, fetch |
| Config | 2 | ~100 | Tier configuration |
| Constants | 1 | 86 | Endpoints, error codes |
| **Total src/** | **38** | **~5328** | |
| Package config | 1 | 75 | No external auth libs |
| Environment | 2 | ~10 | .env + .env.example |
| Documentation | 1 | 226 | README.md |

---

## 6. Implementation Checklist for Token Extraction

When adding token extraction feature:

- [ ] Read: `/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts`
- [ ] Read: `/Users/quocs/Projects/glabs-sdk/src/client.ts` (lines 156-183)
- [ ] Read: `/Users/quocs/Projects/glabs-sdk/src/types/client.ts`
- [ ] Understand: SessionResponse type in token-manager.ts (lines 20-28)
- [ ] Review: Error handling in doRefresh() (lines 112-133)
- [ ] Check: Existing refreshToken() method in client.ts (lines 181-183)
- [ ] Consider: Whether to modify TokenManager or add new method to Client
- [ ] Export: Via services/index.ts if creating new service
- [ ] Test: All error cases (no sessionToken, expired session, network errors)

---

## Absolute File Paths (Ready to Copy)

```
/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts
/Users/quocs/Projects/glabs-sdk/src/client.ts
/Users/quocs/Projects/glabs-sdk/src/types/client.ts
/Users/quocs/Projects/glabs-sdk/src/utils/fetch.ts
/Users/quocs/Projects/glabs-sdk/src/utils/errors.ts
/Users/quocs/Projects/glabs-sdk/src/constants.ts
/Users/quocs/Projects/glabs-sdk/.env.example
/Users/quocs/Projects/glabs-sdk/.env
/Users/quocs/Projects/glabs-sdk/package.json
/Users/quocs/Projects/glabs-sdk/README.md
```

