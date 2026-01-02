# Phase 4: Railway Deployment

**Date**: 2026-01-03
**Priority**: High
**Status**: Pending

## Context

- Main plan: [plan.md](./plan.md)
- Previous: [Phase 3](./phase-03-content-migration.md)
- Target URL: glabs.getvrex.com

## Overview

Deploy Fumadocs site to Railway with custom domain configuration.

## Requirements

- Static export for optimal performance
- Custom domain: glabs.getvrex.com
- Automatic SSL (Let's Encrypt)
- GitHub integration for auto-deploys

## Implementation Steps

### 1. Configure Static Export

```javascript
// next.config.mjs
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

export default withMDX({
  output: "export",
  images: {
    unoptimized: true,
  },
});
```

### 2. Add railway.toml

```toml
# glabs-docs/railway.toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install && pnpm build"

[deploy]
startCommand = "pnpm dlx serve out -l 3000"
healthcheckPath = "/"
healthcheckTimeout = 300

[environments.production]
```

### 3. Configure Root Directory

In Railway dashboard:
- Set **Root Directory** to `glabs-docs`
- Ensure Node.js 18+ is detected

### 4. Custom Domain Setup

**DNS Configuration (Cloudflare/DNS provider):**
```
Type: CNAME
Name: glabs
Target: <railway-provided-domain>.railway.app
```

**Railway Dashboard:**
1. Go to Settings → Domains
2. Add custom domain: glabs.getvrex.com
3. Wait for DNS verification (24-72h max)
4. SSL auto-provisioned

### 5. Environment Variables

Set in Railway dashboard:
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## Deployment Steps

1. **Create Railway project**
   - Connect GitHub repo
   - Set root directory to `glabs-docs`

2. **Configure build**
   - Verify Nixpacks detects Next.js
   - Check build logs for errors

3. **Add custom domain**
   - Add CNAME record at DNS provider
   - Configure in Railway dashboard
   - Verify SSL certificate

4. **Test deployment**
   - Access via Railway-provided URL
   - Access via custom domain
   - Test all pages/links

## Todo List

- [ ] Add `output: 'export'` to next.config.mjs
- [ ] Create railway.toml
- [ ] Create Railway project and connect repo
- [ ] Set root directory to `glabs-docs`
- [ ] Add CNAME DNS record for glabs.getvrex.com
- [ ] Configure custom domain in Railway
- [ ] Verify SSL certificate
- [ ] Test all pages on production

## Success Criteria

- Site accessible at glabs.getvrex.com
- HTTPS working with valid certificate
- All pages load correctly
- Auto-deploys on push to main

## Cost Estimate

Railway Hobby Plan: $5/month
- Sufficient for docs site traffic
- Includes custom domain support

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| DNS propagation delay | Low | Wait 24-72h, use dig to verify |
| SSL provisioning | Low | Railway handles automatically |
| Build failures | Medium | Test locally with `pnpm build` |

## Post-Deployment

- Set up monitoring (optional)
- Configure analytics (optional)
- Create redirect from www subdomain if needed
