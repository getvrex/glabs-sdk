# Phase 2: Theme Customization

**Date**: 2026-01-03
**Priority**: High
**Status**: Pending

## Context

- Main plan: [plan.md](./plan.md)
- Previous: [Phase 1](./phase-01-project-setup.md)

## Overview

Create beautiful dark theme with modern aesthetics matching Vrex branding.

## Design Direction

**Style**: Modern, clean, developer-focused
**Colors**: Dark base with purple/blue gradient accents
**Typography**: Inter for body, JetBrains Mono for code

## Requirements

- Dark mode default
- Purple/blue gradient accents
- Smooth code syntax highlighting
- Responsive mobile layout
- Fast loading (< 2s LCP)

## Implementation Steps

1. **Configure Tailwind theme**
   ```typescript
   // tailwind.config.ts
   import { createPreset } from "fumadocs-ui/tailwind-plugin";

   export default {
     presets: [createPreset()],
     theme: {
       extend: {
         colors: {
           primary: {
             DEFAULT: "hsl(262 83% 58%)", // Purple
             foreground: "hsl(0 0% 100%)",
           },
           accent: {
             DEFAULT: "hsl(217 91% 60%)", // Blue
           },
         },
       },
     },
   };
   ```

2. **Add custom CSS variables**
   ```css
   /* app/globals.css */
   :root {
     --background: 0 0% 7%;
     --foreground: 0 0% 98%;
     --primary: 262 83% 58%;
     --accent: 217 91% 60%;
   }
   ```

3. **Configure fonts**
   ```typescript
   // app/layout.tsx
   import { Inter, JetBrains_Mono } from "next/font/google";

   const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
   const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
   ```

4. **Customize layout**
   - Add Vrex logo in header
   - GitHub link in navigation
   - Custom footer with links

5. **Landing page**
   - Hero section with gradient
   - Feature cards
   - Quick start code snippet
   - Links to docs sections

## Todo List

- [ ] Configure Tailwind with custom colors
- [ ] Add CSS variables for dark theme
- [ ] Set up Inter + JetBrains Mono fonts
- [ ] Add logo/branding to header
- [ ] Create landing page with hero section
- [ ] Test responsive design

## Success Criteria

- Consistent dark theme across all pages
- Code blocks have proper syntax highlighting
- Mobile-friendly layout
- LCP < 2 seconds
- Matches Vrex brand aesthetics

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Theme conflicts | Medium | Use Fumadocs CSS variables |
| Font loading slow | Low | Use next/font optimization |

## Next Steps

→ [Phase 3: Content Migration](./phase-03-content-migration.md)
