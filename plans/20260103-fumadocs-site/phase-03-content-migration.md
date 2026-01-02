# Phase 3: Content Migration

**Date**: 2026-01-03
**Priority**: High
**Status**: Pending

## Context

- Main plan: [plan.md](./plan.md)
- Previous: [Phase 2](./phase-02-theme-customization.md)
- Source docs: `/Users/quocs/Projects/glabs-sdk/docs/`

## Overview

Migrate existing MDX docs to Fumadocs format and fix component/link issues.

## Source Files

| File | Lines | Status |
|------|-------|--------|
| index.mdx | 63 | Needs Card→Fumadocs |
| getting-started.mdx | 136 | Needs Card→Fumadocs |
| client.mdx | 166 | Ready |
| image-generation.mdx | 178 | Ready |
| video-generation.mdx | 237 | Ready |
| recaptcha.mdx | 342 | Ready |
| tier-config.mdx | 214 | Ready |
| api-reference.mdx | 467 | Ready |

## Changes Required

### 1. Component Updates

**Replace Cards/Card** (index.mdx, getting-started.mdx):
```mdx
<!-- Before -->
<Cards>
  <Card title="Getting Started" href="/docs/glabs-sdk/getting-started" />
</Cards>

<!-- After (Fumadocs) -->
import { Cards, Card } from 'fumadocs-ui/components/card';

<Cards>
  <Card title="Getting Started" href="/docs/getting-started" />
</Cards>
```

### 2. Link Updates

**Fix internal links** in all files:
```mdx
<!-- Before -->
href="/docs/glabs-sdk/recaptcha"

<!-- After -->
href="/docs/recaptcha"
```

### 3. Frontmatter

Keep existing frontmatter, add icon if desired:
```yaml
---
title: Getting Started
description: Install and configure the GLabs SDK
icon: Rocket
---
```

### 4. meta.json → meta.ts

```typescript
// content/docs/meta.ts
export default {
  title: "GLabs SDK",
  pages: [
    "index",
    "getting-started",
    "client",
    "image-generation",
    "video-generation",
    "recaptcha",
    "tier-config",
    "api-reference",
  ],
};
```

## Implementation Steps

1. **Copy docs to content/docs/**
   ```bash
   cp docs/*.mdx glabs-docs/content/docs/
   ```

2. **Update Card imports**
   - Add import statement at top
   - Update href paths

3. **Fix internal links**
   - Search/replace `/docs/glabs-sdk/` → `/docs/`

4. **Create meta.ts**
   - Convert meta.json to TypeScript format

5. **Test all pages**
   - Verify each page renders
   - Check all internal links work
   - Verify code highlighting

## Todo List

- [ ] Copy MDX files to content/docs/
- [ ] Update Card/Cards components
- [ ] Fix internal link paths
- [ ] Create meta.ts for navigation
- [ ] Test all pages render correctly
- [ ] Verify code syntax highlighting

## Success Criteria

- All 8 docs pages accessible
- No broken internal links
- Code blocks properly highlighted
- Navigation sidebar shows correct order

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| MDX syntax issues | Medium | Test each file individually |
| Missing components | Low | Use Fumadocs built-in components |

## Next Steps

→ [Phase 4: Railway Deployment](./phase-04-railway-deployment.md)
