# Code Review: Token Extraction via Browserless

**Date:** 2026-02-28
**Reviewer:** code-reviewer subagent
**Scope:** Browserless token extraction feature

---

## Code Review Summary

### Scope
- Files reviewed: 11 (all listed in request)
- Lines of code analyzed: ~450 new/modified lines
- Review focus: Correctness, security (credential handling), error handling, type safety, pattern adherence
- Updated plans: none (no plan file provided)

### Overall Assessment

Solid implementation. The architecture is clean: a pure-static `TokenExtractorService` used by `TokenManager` as a fallback, surfaced via `GLabsClient.extractTokens()` and a new `glabs auth extract` CLI command. TypeScript type check passes with zero errors. Two real issues found — one security, one correctness/UX — plus minor observations.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — `googleEmail` logged in plaintext on every retry attempt

**File:** `src/services/token-extractor.service.ts:42`

```typescript
log.log(
  `[TokenExtractor] Attempt ${attempt}/${MAX_RETRIES} for ${config.googleEmail}`
);
```

Email is PII. When the user provides a custom logger that ships to a log aggregator, the Google account email is emitted on every attempt (up to 3). In most contexts this is just annoying; in shared/multi-tenant environments it becomes a data leak.

**Fix:** Either omit the email entirely or mask it to the domain:

```typescript
const maskedEmail = config.googleEmail.replace(/^[^@]+/, "***");
log.log(`[TokenExtractor] Attempt ${attempt}/${MAX_RETRIES} for ${maskedEmail}`);
```

---

### H2 — `withTokenRefresh` 401-retry skips tokenExtractor path

**File:** `src/client.ts:164-168`

```typescript
if (
  this.config.sessionToken &&     // <-- guards on sessionToken only
  error instanceof GLabsError &&
  error.statusCode === 401
) {
```

If a client is configured with `tokenExtractor` but **no** `sessionToken` (a valid configuration — the extractor is the only refresh path), a 401 response from the API will not trigger a retry. The user will see a hard error even though the client has a Browserless fallback configured.

**Fix:**

```typescript
if (
  (this.config.sessionToken || this.config.tokenExtractor) &&
  error instanceof GLabsError &&
  error.statusCode === 401
) {
```

`forceRefresh()` already handles both paths correctly, so this one-word change is sufficient.

---

## Medium Priority Improvements

### M1 — `resolveCapture` TypeScript definite-assignment suppressed implicitly

**File:** `src/services/token-extractor.service.ts:149-151`

```typescript
let resolveCapture: () => void;
const captureComplete = new Promise<void>((resolve) => {
  resolveCapture = resolve;
});
```

`resolveCapture` is declared without `!` but used inside event callbacks before TypeScript can prove it's assigned. This compiles only because `tsc` infers the executor runs synchronously (which is true for the Promise constructor), but it would fail with `strictPropertyInitialization` if moved to a class field. The pattern is safe as-is, but the intent is clearer with explicit non-null assertion:

```typescript
let resolveCapture!: () => void;
```

### M2 — `peerDependencies` version range is empty string

**File:** `package.json:40`

```json
"peerDependencies": {
  "playwright": ""
}
```

An empty string is a valid semver range (matches everything) but is non-idiomatic and some package managers warn on it. The dev dependency pins `^1.58.2`, so align:

```json
"playwright": ">=1.0.0"
```

### M3 — `cmd-config show` does not display new credentials

**File:** `src/cli/cmd-config.ts:43-52`

`googleEmail`, `googlePassword`, and `browserlessToken` were added to `CliConfig` and to the ENV_MAP, but `glabs config show` does not display them. A user who saved credentials via `glabs auth extract --save` has no way to verify they are stored without manually reading `~/.glabs/config.json`.

**Fix:** Add masked rows to `cmd-config.ts`:

```typescript
["google-email", cfg.googleEmail ?? "(not set)"],
["google-password", maskSecret(cfg.googlePassword)],
["browserless-token", maskSecret(cfg.browserlessToken)],
```

### M4 — `glabs config set` does not accept new credential keys

**File:** `src/cli/cmd-config.ts:56-114`

Related to M3 — users cannot set `googleEmail`, `googlePassword`, or `browserlessToken` via `glabs config set`. They must use `--save` from `glabs auth extract` or edit the JSON directly.

**Fix:** Add the three options to `parseArgs` options and the patch block in `cmd-config.ts`. The `--help` text should also update to list them.

---

## Low Priority Suggestions

### L1 — `.env.example` missing `GLABS_SESSION_TOKEN`

**File:** `.env.example`

`GLABS_SESSION_TOKEN` is a widely-used env var (mapped in `cli-config.ts`) but absent from `.env.example`. Unrelated to this PR but the new PR adds three vars — good time to add the missing one.

### L2 — `saveConfig` in `cmd-auth.ts` persists raw Google password to disk

**File:** `src/cli/cmd-auth.ts:93-100`

```typescript
saveConfig({
  bearerToken: result.bearerToken,
  sessionToken: result.sessionToken,
  googleEmail: email,
  googlePassword: password,   // <-- plaintext on disk
  browserlessToken,
});
```

This is intentional (to allow future automated re-extraction), but worth noting that `~/.glabs/config.json` is not encrypted and will contain the Google account password in plaintext. A warning in the CLI output after `--save` would help:

```
Warning: Google password stored in plaintext at ~/.glabs/config.json
```

### L3 — Retry delay is a magic number

**File:** `src/services/token-extractor.service.ts:52`

```typescript
await new Promise((r) => setTimeout(r, 2000));
```

Not a named constant. Minor, but inconsistent with the named `MAX_RETRIES` above. Extract as `const RETRY_DELAY_MS = 2000`.

### L4 — `extractOnce` browser close before session cookie capture

**File:** `src/services/token-extractor.service.ts:90-96`

Browser is closed before `validateToken`, but `performExtraction` captures the session cookie **before** returning. Order is: close browser → validate token. Cookies are captured inside `performExtraction`, so this is fine. Just worth a comment to prevent future regression.

---

## Positive Observations

- **Clean fallback chain**: `doRefresh` → `doExtractFallback` gracefully degrades. The `if (!sessionToken && tokenExtractor)` early-exit avoids unnecessary network call.
- **Deduplication of concurrent refreshes**: `refreshPromise` pattern prevents simultaneous refreshes — carried over correctly into the new path.
- **Dynamic import of playwright**: Correct. Users who never use extraction don't pay the import cost, and missing playwright gives a clear module-not-found error rather than a silent failure.
- **`maskSecret` used in CLI output**: Tokens in `printTable` are masked. Good.
- **Non-assertion `!` on `tokenExtractor` in `doExtractFallback`**: The non-null assertion `this.config.tokenExtractor!` is safe because all call sites are guarded. Acceptable.
- **Type-check passes clean**: Zero TypeScript errors on the full codebase.
- **No credentials in log lines** (except H1 email): Token values, passwords, and the `browserlessToken` itself are never emitted to the logger.

---

## Recommended Actions

1. **Fix H2** — extend `withTokenRefresh` 401-guard to include `tokenExtractor`. One-line change. Do before any release.
2. **Fix H1** — mask email in retry log line.
3. **Fix M3 + M4** — add new credential keys to `glabs config show` and `glabs config set`.
4. **Add L2 warning** — warn user after `--save` that password is stored plaintext.
5. **M1, L3** — cleanup items, low urgency.

---

## Metrics

- Type Coverage: 100% (tsc --noEmit passes)
- Test Coverage: No unit tests added for new service (no existing unit test pattern in repo — consistent with project norms)
- Linting Issues: 0 (tsc clean)
- Build: Not run (tsup), but type-check is a reliable proxy

---

## Unresolved Questions

1. **Browserless account type**: The `wss://chrome.browserless.io` endpoint is the legacy shared Browserless v1 URL. Browserless v2 uses a different URL format. Is the target Browserless plan confirmed to use this endpoint?
2. **`ensureValid()` with tokenExtractor-only config**: If a user provides only `tokenExtractor` (no `bearerToken`, no `sessionToken`), `ensureValid()` returns early at line 51 (`if (!this.config.sessionToken) return`). The extractor fallback is never triggered proactively — only via `forceRefresh()` after a 401. Is this by design, or should `ensureValid` also trigger extraction when no `sessionToken` is present but `tokenExtractor` is configured?
