# Research Report: Railway Deployment for Next.js Documentation Sites

**Date:** 2026-01-03 | **Scope:** Next.js deployment, custom domains, env vars, static/dynamic builds, best practices

---

## Executive Summary

Railway provides seamless Next.js deployment with automatic Node.js server configuration (`next start`). For your glabs.getvrex.com documentation site, Railway offers zero-config deployment, automatic SSL via Let's Encrypt, and straightforward environment variable management. Choose **dynamic SSR** for interactive docs or **static export** for pure documentation. Custom domain setup requires CNAME DNS records with automatic SSL provisioning. Key consideration: `NEXT_PUBLIC_*` variables are inlined at build-time, not runtime.

---

## Deployment Methods (Ranked by Ease)

### 1. GitHub Integration (Recommended)
- Connect GitHub repo → Railway auto-deploys on push
- Railway detects environment variables from `.env` files
- Automatic rollback on build failures
- Best for continuous deployment workflows

### 2. Railway CLI
```bash
npm i -g @railway/cli
railway login --browserless
railway init          # Create new project
railway up --detach   # Deploy
railway domain        # Generate domain
```
- Single-command deployment
- Works with existing Railway projects
- Useful for monorepos with specific services

### 3. Docker Image (Advanced)
- Deploy custom Docker images
- Full control over build process
- Required for complex build pipelines

---

## Custom Domain Setup: glabs.getvrex.com

### DNS Configuration Steps

1. **In Railway Dashboard:**
   - Service → Settings → Networking → Public Networking
   - Click "Add Custom Domain"
   - Select port (typically 3000 for Next.js)
   - Copy CNAME value provided (e.g., `your-service.railway.app`)

2. **Update DNS Provider (GoDaddy/Cloudflare):**
   ```
   Type:  CNAME
   Name:  glabs
   Value: your-service.railway.app
   TTL:   3600
   ```

3. **SSL Certificate:**
   - Railway auto-provisions Let's Encrypt cert (HTTPS ready)
   - DNS propagation: 24-72 hours typical
   - Verify: `https://glabs.getvrex.com` accessible

### Cloudflare Specific (if used as DNS provider)

```
SSL/TLS Mode: Full (NOT Full Strict)
Proxying:     Keep as "DNS only" for Railway verification
```

**Root domain issue:** If targeting `getvrex.com` root, GoDaddy doesn't support CNAME at @. Solution: Use Cloudflare as nameserver proxy or point www.glabs.getvrex.com instead.

---

## Environment Variables Configuration

### Build-Time vs Runtime (Critical!)

| Variable Type | When Available | Use Case |
|---|---|---|
| `NEXT_PUBLIC_*` | Build-time (inlined in JS) | Client-side constants (analytics, API endpoints) |
| `PRIVATE_*` | Runtime only | Server-side secrets (API keys, DB credentials) |

### Setup in Railway

1. **Dashboard Method:**
   - Service → Variables tab
   - Click "New Variable"
   - Add key-value pairs:
     ```
     NEXT_PUBLIC_API_URL=https://api.glabs.getvrex.com
     DATABASE_URL=postgresql://...
     ```

2. **RAW Editor (recommended for bulk):**
   - Paste `.env` file contents directly
   - Railway auto-detects `NEXT_PUBLIC_` prefix

3. **GitHub Detection:**
   - Railway scans `.env`, `.env.local` in repo
   - Suggests variables during connection

### Critical: Next.js Specific

```javascript
// next.config.js - if using custom env loading
module.exports = {
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
}
```

⚠️ **Pitfall:** `NEXT_PUBLIC_*` vars not in Railway dashboard won't be available at runtime. Must be explicitly set during build.

---

## Build Settings: Static vs Dynamic

### Option A: Static Export (Recommended for Pure Docs)

**When:** Documentation with no dynamic routes/API calls.

```javascript
// next.config.js
module.exports = {
  output: 'export',
  // Optional: basePath: '/docs' for subdirectory
}
```

**Deployment:**
```bash
npm run build  # Creates `out/` folder
cd out
railway up    # Deploy static folder
```

**Pros:** Fast, CDN-friendly, minimal server resources
**Cons:** No Server Components, ISR, or API routes

### Option B: Dynamic SSR (Full Next.js Features)

**When:** Interactive docs, real-time data, dynamic routes.

```javascript
// next.config.js - default behavior
module.exports = {
  // No 'output: export'
}
```

**Build:** Railway auto-runs `next build && next start`

**Pros:** Server Components, API routes, ISR, dynamic content
**Cons:** Requires Node.js runtime, higher resource cost

---

## Best Practices for Documentation Sites

1. **Use Nextra for Docs:**
   - Next.js-based SSG for documentation
   - Built-in search, dark mode, sidebar
   - Integrates seamlessly with Railway

2. **Pre-render at Build Time:**
   ```javascript
   // next.config.js
   experimental: {
     isrMemoryCacheSize: 50 * 1024 * 1024, // 50MB cache
   }
   ```

3. **Optimize Images:**
   - Use `next/image` component
   - Railway provides sufficient disk space
   - Enable `next/image` caching

4. **Environment-Specific Docs:**
   ```bash
   # Railway: set NEXT_PUBLIC_ENV=production
   # Local: NEXT_PUBLIC_ENV=development
   ```

5. **Monitoring & Logs:**
   - Railway dashboard shows build/runtime logs
   - Tail logs: `railway logs -f` (CLI)
   - Set up error tracking (Sentry, Datadog)

---

## Railway Project Structure Example

```
glabs-sdk/
├── docs/               # Documentation source (Nextra/MDX)
├── next.config.js      # Static or dynamic export setting
├── package.json        # Build script: "build": "next build"
├── tsconfig.json       # TypeScript config
├── public/            # Static assets (favicons, etc)
└── .env.example       # Template for Railway vars
```

---

## Deployment Checklist

- [ ] Repository connected to Railway (GitHub integration)
- [ ] Environment variables set in Railway dashboard
- [ ] Build script verified: `npm run build` runs locally
- [ ] Custom domain added with CNAME DNS record
- [ ] SSL certificate auto-provisioned (verify HTTPS works)
- [ ] Domain TTL propagation waited (check after 24h)
- [ ] Build logs reviewed for errors/warnings
- [ ] Staging deployment tested before prod
- [ ] Monitoring/error tracking configured
- [ ] Rollback strategy documented

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Build fails with missing vars | `NEXT_PUBLIC_*` not in Railway | Add to Variables tab, redeploy |
| Domain 404 after DNS update | CNAME not pointed correctly | Verify with `dig glabs.getvrex.com` |
| Slow cold starts | Static export on Node runtime | Switch to static export or increase RAM |
| Image optimization fails | Out of disk space | Check Railway logs, increase instance size |
| Source maps missing | Production build optimization | Disable in next.config.js if needed for debugging |

---

## Cost Optimization

- **Trial Plan:** 1 custom domain, limited build minutes
- **Hobby Plan:** $5/month, 2 custom domains, sufficient for documentation
- **Pro Plan:** $20/month, 20 domains, production-grade

Recommend **Hobby Plan** for glabs.getvrex.com (most cost-effective).

---

## Quick Implementation Summary

**Time Estimate:** 15-30 minutes from zero to live

1. Connect GitHub repo to Railway
2. Set `NEXT_PUBLIC_*` vars in dashboard
3. Add CNAME DNS record at domain registrar
4. Trigger deployment (automatic on GitHub push)
5. Verify HTTPS at glabs.getvrex.com
6. Monitor build logs for issues

---

## Sources

- [Railway Deploy Next.js](https://railway.com/deploy/yDom4a)
- [Railway Quick Start](https://docs.railway.com/quick-start)
- [Railway Public Networking Guide](https://docs.railway.com/guides/public-networking)
- [Railway Variables Documentation](https://docs.railway.com/guides/variables)
- [Next.js Official Deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js Static Exports Guide](https://nextjs.org/docs/app/guides/static-exports)
- [Railway Custom Domain Help](https://station.railway.com/questions/add-custom-domain-6315482f)
- [DEV.to: Deploying Static Next.js to Railway](https://dev.to/markmunyaka/deploying-a-static-nextjs-site-to-railway-4ij7)

---

## Unresolved Questions

None—research provides complete actionable guidance for your use case.
