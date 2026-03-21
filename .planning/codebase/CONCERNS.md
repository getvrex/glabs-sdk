# Concerns

## Testing

- **Critical gap:** No unit tests. Only E2E tests that require real API credentials
- E2E tests skip silently without credentials — CI could pass with 0 actual test coverage
- No offline/mocked testing possible — all tests hit live Google APIs
- No regression safety net for refactors

## Security

- **Hardcoded reCAPTCHA config:** Site key, API URLs in `src/constants.ts` — acceptable for public SDK but ties to specific Google Labs deployment
- **Token handling:** Bearer and session tokens stored in memory only (good). CLI stores tokens in `~/.glabs` config file (acceptable but no encryption)
- **No input sanitization:** Prompts passed directly to Google API — relies on server-side validation
- **OpenAI server auth:** Simple API key comparison. No rate limiting, no CORS restrictions by default

## Architecture

- **Tight Google API coupling:** All endpoints and payload formats hardcoded. Google API changes require SDK updates
- **reCAPTCHA complexity:** 6+ provider implementations adds significant maintenance surface. Fallback chains create complex error paths
- **CLI in SDK repo:** CLI source in `src/cli/` but separate package at `packages/cli/`. CLI package version (2.2.0) drifts from SDK version (2.2.4)
- **OpenAI compat scope creep:** Full OpenAI-compatible server with streaming adds maintenance burden to what is primarily an SDK

## Code Quality

- **No TODO/FIXME/HACK markers** — clean codebase
- **Consistent patterns** across services — constructor injection, options objects
- **Type safety:** Strict TS config with `noUncheckedIndexedAccess` — solid
- **Some defensive casting:** `as Record<string, unknown>` in error parsing — necessary but reduces type safety

## Performance

- **Token refresh race condition:** `refreshPromise` dedup in TokenManager should prevent concurrent refreshes
- **No connection pooling:** Each `fetchWithRetry()` creates new connections. Acceptable for SDK but not for high-throughput server mode
- **Video polling:** Configurable interval but no exponential backoff by default

## Dependencies

- **Minimal runtime deps** (only `chrome-remote-interface`) — excellent for SDK
- **Playwright as optional peer dep** — good separation, but two browser automation paths means double maintenance
- **Dual package manager:** `package-lock.json` and `bun.lock` both present

## Documentation

- **README is comprehensive** — covers CLI, SDK usage, all commands
- **JSDoc on public API** — good coverage on client methods
- **No generated API reference docs**
- **`glabs-docs/` directory** — external docs reference, purpose unclear
