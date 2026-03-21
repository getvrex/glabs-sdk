# Executive Summary: Token Management Scout Report

**Date:** 2026-02-28  
**Project:** @getvrex/glabs-sdk (v2.1.1)  
**Status:** Complete. Infrastructure fully documented.

---

## TL;DR: What You Need to Know

This SDK has a **complete, production-ready token management system** with automatic refresh via Session Token → Access Token (ST→AT) conversion. No external auth libraries are used—everything is custom-built using standard fetch() calls.

**To add token extraction feature:**
1. Add method to `/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts`
2. Expose via `/Users/quocs/Projects/glabs-sdk/src/client.ts`
3. Done. Reuses existing ST→AT logic.

---

## 1. Token Management: The Essentials

### Two-Token System
```
sessionToken (input)                bearerToken (input)
     ↓                                    ↓
__Secure-next-auth.session-token    Authorization: Bearer <token>
(cookie value, used for refresh)    (API auth, 3h+ expiry)
     ↓                                    ↓
Call ST→AT endpoint            Used in all API requests
     ↓                                    ↓
Get fresh access token          Refreshed when < 1h remaining
     ↓                                    ↓
Update bearerToken             Or immediately after 401
```

### Refresh Mechanism
- **Proactive:** Triggers when <1 hour remains
- **Reactive:** Triggers on 401 response
- **Deduplication:** Prevents concurrent refresh calls
- **In-Memory Only:** No persistent storage

### ST→AT Endpoint
```
GET https://labs.google/fx/api/auth/session
Cookie: __Secure-next-auth.session-token=<sessionToken>

Response: {
  access_token: "ya29.a0ATk...",
  expires: "2026-02-28T15:30:00Z",
  user: { email: "user@example.com", name: "..." }
}
```

---

## 2. Critical Files (Read in Order)

| File | Lines | Purpose |
|------|-------|---------|
| **token-manager.ts** | 150 | ST→AT conversion, refresh logic ⭐⭐⭐ |
| **client.ts** | 446 | Wraps all APIs with token refresh |
| **types/client.ts** | 55 | GLabsClientConfig, ResolvedConfig types |
| **utils/fetch.ts** | 117 | HTTP headers + retry logic |
| **utils/errors.ts** | 186 | Auth error parsing & classification |
| **constants.ts** | 86 | Endpoints, headers, error codes |

**All absolute paths:**
- `/Users/quocs/Projects/glabs-sdk/src/services/token-manager.ts`
- `/Users/quocs/Projects/glabs-sdk/src/client.ts`
- `/Users/quocs/Projects/glabs-sdk/src/types/client.ts`
- `/Users/quocs/Projects/glabs-sdk/src/utils/fetch.ts`
- `/Users/quocs/Projects/glabs-sdk/src/utils/errors.ts`
- `/Users/quocs/Projects/glabs-sdk/src/constants.ts`

---

## 3. Directory Structure (src/)

```
38 files total

src/
├── services/               (9 files)
│   └── token-manager.ts   ⭐ Token refresh
├── types/                 (9 files)
│   └── client.ts          ⭐ Config types
├── utils/                 (3 files)
│   ├── fetch.ts           ⭐ HTTP + headers
│   └── errors.ts          ⭐ Error handling
├── cli/                   (10 files)
├── config/                (2 files)
├── client.ts              (1 file) ⭐ Main client
├── openai-server.ts       (1 file)
├── constants.ts           (1 file) ⭐ Endpoints
└── index.ts               (1 file)
```

---

## 4. Current Environment Setup

**Configured in .env:**
- ✅ GLABS_BEARER_TOKEN (ya29.a0ATk...)
- ✅ GLABS_SESSION_TOKEN (eyJhbGc...) — enables auto-refresh
- ✅ GLABS_PROJECT_ID (UUID)
- ✅ RECAPTCHA_API_KEY
- ✅ RECAPTCHA_PROVIDER=playwright

**For use as template:** See `.env.example`

---

## 5. How Token Refresh Works

### Sequence Diagram
```
Client calls any API
    ↓
withTokenRefresh() wrapper
    ├─ Call ensureValid()
    │   ├─ Check if token needs refresh
    │   │   ├─ No expiry? → Yes, refresh needed
    │   │   ├─ <1h remaining? → Yes, refresh needed
    │   │   └─ Otherwise? → No refresh
    │   └─ If refresh needed:
    │       └─ Call doRefresh()
    │           └─ GET https://labs.google/fx/api/auth/session
    │               → Receive new access_token
    │               → Update config.bearerToken
    │
    ├─ Execute API call with current bearerToken
    │   └─ buildHeaders() adds Authorization header
    │
    └─ On 401 error:
        ├─ Is sessionToken configured?
        ├─ Yes? → Call forceRefresh() → Retry API
        └─ No? → Throw error
```

### Example: Image Generation
```typescript
const client = new GLabsClient({
  bearerToken: 'ya29.a...',
  sessionToken: 'eyJhbGc...',  // Enables auto-refresh
});

// This automatically:
// 1. Checks if token needs refresh
// 2. Refreshes if needed via ST→AT
// 3. Makes API call with fresh token
// 4. Retries once on 401 after forced refresh
const result = await client.images.generate({
  prompt: 'A sunset over mountains'
});
```

---

## 6. Error Handling

### Auth-Related Errors
- **401 Unauthorized** → Refresh + retry (if sessionToken)
- **403 Forbidden** → Check if reCAPTCHA needed
- **"Cannot refresh token: no sessionToken"** → Needs session token
- **"Session cookie expired"** → Session token invalid/expired
- **"No access_token in response"** → Malformed ST→AT response

All wrapped in custom `GLabsError` class with:
- `code`: Error classification
- `statusCode`: HTTP status
- `message`: User-friendly description

---

## 7. Package Dependencies

**Runtime:**
- `chrome-remote-interface` (for reCAPTCHA)

**Dev:**
- `playwright` (optional peer dep)
- `typescript`, `tsup`, `dotenv`

**No external auth libraries.** Token management is fully custom.

---

## 8. Architecture Pattern

**Three-Layer Pattern:**

```
Layer 1: Configuration (types/client.ts)
  └─ GLabsClientConfig (input)
     └─ ResolvedConfig (internal, mutable bearerToken)

Layer 2: Token Management (services/token-manager.ts)
  └─ Manages token lifecycle
     ├─ ensureValid() — proactive refresh
     ├─ forceRefresh() — reactive refresh
     └─ doRefresh() — ST→AT endpoint call

Layer 3: API Integration (services/*.ts + client.ts)
  └─ All services use config.bearerToken
     ├─ Image generation
     ├─ Video generation
     ├─ Project management
     └─ Wrapped by withTokenRefresh()
```

---

## 9. For Token Extraction Feature

### Recommended Approach

**Add to TokenManager:**
```typescript
async extractAccessToken(): Promise<{
  accessToken: string;
  expiresAt?: Date;
  user?: { email: string; name: string };
}>
```

**Expose via Client:**
```typescript
async extractToken(): Promise<{
  accessToken: string;
  expiresAt?: Date;
  user?: { email: string; name: string };
}>
```

**Benefits:**
- Reuses existing ST→AT logic
- Returns token + metadata without modifying client state
- Consistent error handling
- Easy to test

---

## 10. Quick Reference: File Purposes

| File | What It Does |
|------|-------------|
| token-manager.ts | ST→AT calls, refresh scheduling, expiry tracking |
| client.ts | Initializes TokenManager, wraps APIs, handles 401 |
| types/client.ts | Defines GLabsClientConfig, ResolvedConfig |
| utils/fetch.ts | Adds Authorization header, retry logic |
| utils/errors.ts | Parses Google API errors, auth-specific handling |
| constants.ts | API endpoints, headers, error codes, thresholds |
| services/image.ts | Image generation, uses config.bearerToken |
| services/video.ts | Video generation, uses config.bearerToken |
| services/project.ts | Project API, uses config.bearerToken |
| cli/*.ts | CLI commands, uses client for auth |

---

## 11. Key Statistics

- **Total src/ files:** 38
- **Token/auth files:** 6 primary
- **Supporting services:** 11 (image, video, project, recaptcha, whisk, openai-compat)
- **Lines in token-manager.ts:** 150
- **Refresh threshold:** 1 hour before expiry
- **401 retry strategy:** Refresh once + retry once
- **Token storage:** In-memory only (no persistence)
- **External auth libs:** 0 (fully custom)

---

## 12. Summary

✅ **Complete token refresh mechanism** — ST→AT conversion working  
✅ **Proactive + reactive refresh** — Never hit 401 unless forced  
✅ **Deduplication** — Concurrent requests don't double-refresh  
✅ **Error classification** — Auth errors properly handled  
✅ **Type-safe** — Full TypeScript support  
✅ **No external deps** — Custom implementation  
✅ **Well-structured** — Clear separation of concerns  
✅ **Documented** — README + docs/ folder  

**Ready for token extraction feature implementation.**

---

## Reports Generated

1. `scout-2026-02-28-token-management.md` — Detailed analysis (12 sections)
2. `scout-2026-02-28-token-management-summary.txt` — Quick reference
3. `scout-2026-02-28-file-inventory.md` — Complete file listing
4. `SCOUT-EXECUTIVE-SUMMARY.md` — This file

All reports in: `/Users/quocs/Projects/glabs-sdk/plans/reports/`

