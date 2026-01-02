# Phase 1: Project Setup

**Date**: 2026-01-03
**Priority**: High
**Status**: Pending

## Context

- Main plan: [plan.md](./plan.md)
- SDK repo: /Users/quocs/Projects/glabs-sdk

## Overview

Initialize Fumadocs project in `glabs-docs/` subdirectory of SDK repo.

## Requirements

- [x] Next.js 15 with App Router
- [x] Fumadocs with ESM support
- [x] TypeScript strict mode
- [x] pnpm package manager

## Implementation Steps

1. **Create Fumadocs project**
   ```bash
   cd /Users/quocs/Projects/glabs-sdk
   pnpm create fumadocs-app glabs-docs
   # Select: Next.js, default options
   ```

2. **Verify structure**
   - `app/` - Next.js app router
   - `content/docs/` - MDX content
   - `lib/source.ts` - Fumadocs source config
   - `source.config.ts` - Collection definitions
   - `next.config.mjs` - ESM config (required)

3. **Configure package.json**
   ```json
   {
     "name": "glabs-docs",
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start"
     }
   }
   ```

4. **Add to root .gitignore**
   ```
   glabs-docs/.next/
   glabs-docs/node_modules/
   glabs-docs/.source/
   ```

## Todo List

- [ ] Run `pnpm create fumadocs-app glabs-docs`
- [ ] Verify ESM config (`next.config.mjs`)
- [ ] Test `pnpm dev` works
- [ ] Update root `.gitignore`

## Success Criteria

- `pnpm dev` runs without errors
- Default Fumadocs docs page accessible at localhost:3000/docs
- No ESM/CommonJS errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| ESM config issues | High | Ensure `next.config.mjs` extension |
| Version conflicts | Medium | Use latest Fumadocs version |

## Next Steps

→ [Phase 2: Theme Customization](./phase-02-theme-customization.md)
