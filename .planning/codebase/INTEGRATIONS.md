# Integrations

## Google Labs AI APIs (Primary)

**Base URL:** `https://aisandbox-pa.googleapis.com/v1`

### Image API
- `POST /flow/uploadImage` — Upload image
- `POST /:uploadUserImage` — Upload user image
- `POST /flow/upsampleImage` — Upscale image
- `POST /projects/{projectId}/flowMedia:batchGenerateImages` — Generate images (Imagen 4)
- `POST /whisk:getVideoCreditStatus` — Credit status

### Video API
- `POST /video:batchAsyncGenerateVideoText` — Text-to-video (Veo 3.1)
- `POST /video:batchAsyncGenerateVideoStartImage` — Image-to-video (start frame)
- `POST /video:batchAsyncGenerateVideoStartAndEndImage` — Image-to-video (start+end frames)
- `POST /video:batchAsyncGenerateVideoExtendVideo` — Extend video
- `POST /video:batchAsyncGenerateVideoReshootVideo` — Camera control reshoot
- `POST /video:batchAsyncGenerateVideoUpsampleVideo` — Upscale to 1080p
- `POST /video:batchAsyncGenerateVideoReferenceImages` — Reference images video
- `POST /video:batchCheckAsyncVideoGenerationStatus` — Poll status

### Project API (tRPC)
**Base URL:** `https://labs.google/fx/api/trpc`
- `project.searchUserProjects` — List user projects
- `project.getProject` — Get project by ID

## Authentication

- **Bearer token:** Google AI API access token (primary auth)
- **Session token:** `__Secure-next-auth.session-token` cookie — converted to bearer via session endpoint
- **Token refresh:** Automatic ST→AT conversion via `https://labs.google/fx/api/auth/session`
- **Token extraction:** Automated via Browserless.io or local Chromium (Playwright)
- **Auto-refresh:** Proactive refresh when <1 hour remaining; auto-retry on 401

## reCAPTCHA Solving (6+ providers)

| Provider | Type | Implementation |
|---|---|---|
| `yescaptcha` | Cloud API | `src/services/recaptcha.service.ts` |
| `capsolver` | Cloud API | `src/services/recaptcha.service.ts` |
| `regotcha` | Cloud API | `src/services/recaptcha.service.ts` |
| `veo3solver` | Cloud API | `src/services/recaptcha.service.ts` |
| `chrome` | Local CDP | `src/services/chrome-recaptcha.service.ts` |
| `playwright` | Local browser | `src/services/playwright-recaptcha.service.ts` |
| `custom` | User callback | Custom function passed by consumer |

- reCAPTCHA v3 Enterprise, site key: `6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV`
- Supports fallback chain (primary → fallback provider)
- Retry with evaluation failure detection

## OpenAI-Compatible Server

- `src/openai-server.ts` — HTTP server using `node:http`
- Endpoints: `POST /v1/chat/completions`, `GET /v1/models`
- Supports streaming (SSE) and non-streaming responses
- Concurrency queue for parallel generation management
- API key authentication
