# Stack

## Language & Runtime

- **Language:** TypeScript (strict mode, ESNext target)
- **Runtime:** Node.js (ESM modules, `"type": "module"`)
- **Test runner:** Bun (`bun test`)
- **Package manager:** npm (package-lock.json present, bun.lock also present)

## Frameworks & Libraries

| Dependency | Type | Purpose |
|---|---|---|
| `chrome-remote-interface` | runtime | Chrome DevTools Protocol for reCAPTCHA solving |
| `playwright` | optional peer | Alternative reCAPTCHA solver via browser automation |
| `tsup` | dev | Build/bundle tool (ESM output, tree-shaking) |
| `typescript` | dev | Type checking (v5+) |
| `dotenv` | dev | Environment variable loading for tests |

**Zero runtime dependencies** beyond `chrome-remote-interface`. Playwright is optional peer dep.

## Build System

- **Bundler:** tsup (`tsup.config.ts`)
- **Two build entries:**
  1. Library: `src/index.ts`, `src/types/index.ts`, `src/openai-server.ts` → ESM + DTS
  2. CLI: `src/cli/cli-entry.ts` → ESM with shebang banner
- **Output:** `dist/` directory
- **Scripts:** `build`, `dev` (watch), `check-types`, `test`, `test:e2e`

## TypeScript Configuration

- Target: ESNext, Module: ESNext, ModuleResolution: bundler
- Strict mode with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- `verbatimModuleSyntax: true` — explicit `type` imports required
- Declaration maps enabled for IDE navigation

## Package Exports

```json
{
  ".": "SDK main entry (GLabsClient + all exports)",
  "./types": "Type-only exports",
  "./openai": "OpenAI-compatible server",
  "./cli": "CLI entry point"
}
```

## Versioning & Release

- **Current version:** 2.2.4
- **Release tool:** release-please (Google automated release)
- **Registry:** npm public (`@getvrex/glabs-sdk`)
- **Monorepo-lite:** Separate CLI package at `packages/cli/` (`@getvrex/glabs-cli` v2.2.0) — thin wrapper that depends on `@getvrex/glabs-sdk`
