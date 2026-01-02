# GLabs SDK Documentation Site

**Date**: 2026-01-03
**Status**: Planning
**URL**: glabs.getvrex.com
**Hosting**: Railway

## Overview

Build a beautiful documentation site for @getvrex/glabs-sdk using Fumadocs, hosted on Railway.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Docs Framework | Fumadocs |
| Styling | Tailwind CSS + shadcn/ui |
| Search | Orama (built-in) |
| Hosting | Railway |
| Domain | glabs.getvrex.com |

## Phases

| Phase | Name | Status | Link |
|-------|------|--------|------|
| 1 | Project Setup | Pending | [phase-01-project-setup.md](./phase-01-project-setup.md) |
| 2 | Theme Customization | Pending | [phase-02-theme-customization.md](./phase-02-theme-customization.md) |
| 3 | Content Migration | Pending | [phase-03-content-migration.md](./phase-03-content-migration.md) |
| 4 | Railway Deployment | Pending | [phase-04-railway-deployment.md](./phase-04-railway-deployment.md) |

## Structure

```
glabs-docs/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (landing)
│   └── docs/[[...slug]]/page.tsx
├── content/docs/
│   ├── index.mdx
│   ├── getting-started.mdx
│   ├── client.mdx
│   ├── image-generation.mdx
│   ├── video-generation.mdx
│   ├── recaptcha.mdx
│   ├── tier-config.mdx
│   └── api-reference.mdx
├── lib/source.ts
├── source.config.ts
└── tailwind.config.ts
```

## Key Decisions

1. **Monorepo vs Separate Repo**: Create `glabs-docs/` subdirectory in SDK repo for easy content sync
2. **Theme**: Custom dark theme with purple/blue gradient accent (matches Vrex branding)
3. **Search**: Orama (free, built-in) - sufficient for SDK docs
4. **Static Export**: Use `output: 'export'` for Railway optimization
