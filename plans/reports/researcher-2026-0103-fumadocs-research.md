# Research Report: Fumadocs Documentation Framework

**Research Date:** January 3, 2026
**Framework:** Next.js Documentation (ESM-based)
**Version Focus:** Fumadocs 16+

---

## Executive Summary

Fumadocs is a composable React.js documentation framework built for Next.js, offering production-ready theming, MDX-first content management, and SDK-optimized features. Setup takes ~5 minutes via CLI. Three customization paths available: CSS variables (easiest), CLI customization (recommended), or headless mode (full control). Railway deployment requires minimal config—auto-detects Next.js projects. Best suited for SDKs due to OpenAPI support, interactive components, and live API metadata capabilities.

---

## Key Findings

### 1. Quick Setup (3 Paths)

**Path A: CLI (Recommended)**
```bash
pnpm create fumadocs-app
# Choose framework: Next.js, Tanstack Start, or React Router
```
Interactive setup handles: routing, layout, search integration.

**Path B: Manual Installation**
- Next.js config MUST be `.mjs` file (ESM requirement)
- Import `createMDX` from `'fumadocs-mdx/next'`
- Create `lib/source.ts` for Fumadocs source config
- Content lives in `content/docs/` folder
- Run `next dev` to generate `.source/` metadata

**Path C: Existing Project Integration**
- Works with App Router (Next.js 13+)
- Supports Content Collections or custom CMS
- Framework-agnostic: Tanstack Start, React Router, Waku supported

### 2. Theme & Customization Options

**Built-in Defaults**
- Professional, accessible theme pre-configured
- Based on Tailwind CSS + shadcn/ui components
- Zero-config dark mode support
- Ready for production use immediately

**Customization Levels:**

| Level | Method | Effort | Use Case |
|-------|--------|--------|----------|
| **Easy** | CSS Variables | 5 min | Quick color/font tweaks |
| **Medium** | CLI Customization | 15 min | Layout & component styling |
| **Advanced** | Headless Mode | Custom | Complete design control |

**CSS Variable Customization**
```typescript
// tailwind.config.ts - extend fumadocs-ui plugin
import { createPreset } from "fumadocs-ui/tailwind-plugin"

export default {
  presets: [createPreset()],
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--color-primary))",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        display: "var(--font-display)"
      }
    }
  }
}
```

**CLI Customization Command**
```bash
pnpm dlx @fumadocs/cli customise
# Choose layout (docs/landing) to customize
# Generates customized component files
```

### 3. MDX Content Structure

**Default Directory Layout**
```
content/
├── docs/
│   ├── getting-started.mdx
│   ├── api/
│   │   ├── overview.mdx
│   │   └── reference.mdx
│   └── guides/
│       └── integration.mdx
└── meta.json
```

**Collection Definition** (`source.config.ts`)
```typescript
import { defineConfig, defineDocs } from "fumadocs-mdx/config"

export const { docs, meta } = defineDocs({
  dir: "content/docs"
})

export default defineConfig({
  collections: { docs, meta }
})
```

**Auto-Included Remark Plugins**
- `remarkImage` - Image handling & optimization
- `remarkHeading` - TOC extraction
- `remarkStructure` - Search indexing (Orama/Algolia compatible)

**MDX Preset Benefits**
- Syntax highlighting via Shiki (pre-configured)
- Codeblock groups & tabs
- Callouts & cards components
- Type-safe frontmatter validation (Zod schemas)

### 4. SDK Documentation Best Practices

**Fumadocs Strengths for SDKs**

1. **OpenAPI Integration** - Auto-generate API reference from schemas
2. **Interactive Components** - Embed playgrounds, live demos, environment pickers
3. **Code Switcher** - Show examples in multiple languages (TypeScript, Python, Go, etc.)
4. **Live Metadata** - Keep API docs in sync with code automatically
5. **React Server Components** - Database-driven dynamic content for endpoint docs

**Recommended Structure for SDK Docs**
```
content/docs/
├── introduction.mdx
├── getting-started/
│   ├── installation.mdx
│   ├── authentication.mdx
│   └── first-request.mdx
├── api-reference/
│   ├── overview.mdx
│   └── [endpoint].mdx (OpenAPI-generated)
├── guides/
│   ├── error-handling.mdx
│   └── rate-limiting.mdx
└── sdk/
    ├── typescript.mdx
    ├── python.mdx
    └── go.mdx
```

**Interactive Component Example**
```jsx
import { Playground } from 'fumadocs-ui/components/playground'

<Playground
  code={`
const client = new GlabsSDK({ apiKey: 'key' })
const response = await client.users.list()
  `}
  language="typescript"
/>
```

### 5. Railway Deployment

**Auto-Detection Setup**
1. Connect GitHub repo to Railway
2. Railway auto-detects Next.js → uses Nixpacks builder
3. Default build: `pnpm build`
4. Default start: Next.js production server

**Optional: railway.toml Configuration**
```toml
[build]
buildCommand = "pnpm install && pnpm build"

[deploy]
startCommand = "pnpm start"

[environments.production]
# Override for prod only
startCommand = "next start -p 3000"
```

**Recommended Settings**
- Node.js version: 18+ (Fumadocs requires ESM)
- Memory: 512MB minimum (1GB recommended for large docs)
- Pre-deploy hooks: DB migrations if using dynamic content

**Custom Dockerfile Option**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

---

## Implementation Roadmap

### Phase 1: Setup (30 min)
```bash
# 1. Create project
pnpm create fumadocs-app

# 2. Select Next.js + choose UI library
# → Auto-generates: layouts, routing, search config

# 3. Verify structure
ls -la # Should see: content/, lib/source.ts, fumadocs.config.ts
```

### Phase 2: Customize Theme (30 min)
```bash
# Option A: Quick colors via CSS variables (5 min)
# Edit: tailwind.config.ts

# Option B: Component customization (15 min)
pnpm dlx @fumadocs/cli customise

# Option C: Custom fonts
# Register in: app/layout.tsx (CSS variables)
```

### Phase 3: Content Structure (1 hr)
- Create `/content/docs/` directory hierarchy
- Add `meta.json` for sidebar navigation
- Write MDX with frontmatter (title, description)
- Test `pnpm dev` locally

### Phase 4: Deploy (15 min)
- Push to GitHub
- Connect repo to Railway
- Set Node version to 18+
- Deploy → auto-built and running

---

## Critical Configuration Points

**ESM Requirement**
- Next.js config MUST be `.mjs` (not `.js`)
- Fumadocs is ESM-only, no CommonJS support

**Content Discovery**
- Files in `content/docs/` auto-indexed on build
- `meta.json` controls sidebar/navigation order
- Frontmatter (YAML) required for metadata

**Search Configuration**
- Default: Orama (built-in, no setup)
- Alternative: Algolia (requires API key)
- Auto-indexing via `remarkStructure` plugin

**Build Performance**
- Initial build: 1-2 min (depends on content volume)
- Rebuild on file change: <1 sec (Turbopack with Next.js 15)
- No external service required for basic docs

---

## Common Pitfalls & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Build fails with "ESM" error | next.config.js not .mjs | Rename to `next.config.mjs` |
| Docs not appearing | Missing `meta.json` | Create `content/docs/meta.json` with nav structure |
| Search not working | Orama not configured | Ensure `@fumadocs/openapi` installed |
| Styles look wrong | Tailwind plugin not applied | Import plugin in `tailwind.config.ts` |
| Railway build timeout | Large docs or slow install | Increase build timeout to 1000s in Railway settings |

---

## Recommended Tech Stack for SDK Docs

```
Frontend: Fumadocs + React 18+
Styling: Tailwind CSS + shadcn/ui
Search: Orama (free) or Algolia (paid, better UX)
Hosting: Railway (simplest) / Vercel (tighter Next.js integration)
CI/CD: GitHub Actions (built into Railway)
Content: MDX + TypeScript (type-safe metadata)
```

---

## Unresolved Questions

1. **Live API Sync** - How to auto-generate OpenAPI docs from TypeScript SDK types?
2. **Version Management** - Multi-version docs strategy for SDK releases?
3. **Analytics** - Best approach to track docs usage (GA4, PostHog, custom)?
4. **Monorepo Support** - Recommended structure if SDK + docs in same repo?
5. **Workflow Integration** - CI pipeline to validate code examples in docs?

---

## Sources

- [Fumadocs Official Site](https://www.fumadocs.dev/)
- [Fumadocs GitHub Repository](https://github.com/fuma-nama/fumadocs)
- [Build Modern Documentation Sites with Next.js & Fumadocs](https://next.jqueryscript.net/next-js/documentation-fumadocs-framework/)
- [Setup Fumadocs with Next.js in 5 Minutes](https://www.danielfullstack.com/article/setup-fumadocs-with-nextjs-in-5-minutes)
- [Fumadocs MDX Documentation](https://www.fumadocs.dev/docs/mdx)
- [Fumadocs for APIs and SDKs](https://www.infrasity.com/blog/fumadocs-for-apis-and-sdks)
- [Railway Deployment Docs](https://docs.railway.com/guides/deployments)
- [Railway Config as Code](https://docs.railway.com/guides/config-as-code)
- [Deploy Fumadocs on Fleek](https://resources.fleek.xyz/guides/deploy-fumadocs-fullstack-nextjs-on-fleek-guide/)
