# Research Report: LLM-Friendly Documentation Standards

**Date:** January 3, 2026
**Report Duration:** Latest adoption data (2024-2025)
**Sources:** 10+ authoritative sources

## Executive Summary

The **llms.txt standard** (proposed Sept 2024 by Jeremy Howard/Answer.AI) has achieved rapid adoption across 844K+ websites. Two-file approach recommended: **llms.txt** (index/nav) + **llms-full.txt** (complete content). TypeScript SDK should implement both for maximum LLM accessibility. Adopters report 10x token reduction vs. HTML, 10% signups from LLM-assisted discovery. Major players (Anthropic, Vercel, Stripe, Cursor) already deployed.

## Key Findings

### 1. llms.txt Standard Overview

**Format:** Plain text Markdown file at `/llms.txt` (HTTP 200, text/plain MIME, UTF-8)

**Structure:**
```
# Organization Name
> Brief description

## Section 1
- [Link Title](url) - Description of content

## Section 2
- [Link Title](url) - Description
```

**Purpose:** Index file directing LLMs to your canonical documentation. Think of it as robots.txt for AI—signals which content is LLM-optimized and authoritative.

### 2. llms.txt vs llms-full.txt

| Aspect | llms.txt | llms-full.txt |
|--------|----------|---------------|
| **Size** | Compact (1-2K tokens) | Comprehensive (100K-500K tokens) |
| **Purpose** | Navigation/discovery | Complete reference |
| **Use Case** | Initial discovery, selective reading | Full context loading, offline use |
| **LLM Behavior** | Follows links → reads detailed pages | Single file parse → immediate context |

**Recommendation:** Deploy both. Anthropic, Stripe, Cloudflare, Cursor all do this.

### 3. Best Practices for SDK Docs

**Content Organization:**
- Use H1 for title, H2 for major sections (Installation, API Reference, Examples, Troubleshooting)
- **Heavy use of code examples** - LLMs extract and reuse code reliably with real samples
- **Consistent API documentation** - Function signature, parameters, return type, example for each method
- Avoid jargon; link explanations inline
- Short paragraphs/bullet points > walls of text

**Markdown Optimization:**
- Strip navigation, ads, JavaScript references
- Use clear semantic heading hierarchy
- Include language tags in code blocks (markdown syntax highlighting for LLMs)
- Link interdependencies (cross-references between related methods)

### 4. Real-World Examples

**Anthropic:**
- llms.txt: 8,364 tokens (index to docs)
- llms-full.txt: 481,349 tokens (complete API reference)
- URL: docs.claude.com/llms-full.txt

**Vercel AI SDK:**
- ai-sdk.dev/llms.txt provides full Markdown documentation
- Proposes HTML script tag: `<script type="text/llms.txt">` for auth-protected endpoints
- Reports 10x token reduction HTML→Markdown

**Stripe:**
- docs.stripe.com/llms.txt with product-based organization
- Separate "Optional" sections for specialized tools
- Agent-friendly structure: links grouped by use case

**Adoption:** 844K websites (BuiltWith), 788+ verified in directories, ~50 major tech companies

### 5. Tool Ecosystem

**Auto-Generation:**
- **Mintlify:** Automatically generates llms.txt + llms-full.txt
- **GitBook:** Native support, auto-update with content changes
- **Docusaurus:** docusaurus-plugin-llms plugin
- **Cloudflare, Cursor:** Native integration

**Integration Points:**
- VS Code PagePilot Extension (reads llms.txt)
- ChatGPT/Perplexity can use as context source
- LLM-powered coding assistants (Codeium, etc.)

## Implementation Roadmap for SDK

**Phase 1 (Quick Win - 1-2 hours):**
1. Generate `/llms.txt` from existing docs/getting-started.mdx, docs/api-reference.mdx
2. Structure: Installation → Client Basics → Image Gen → Video Gen → reCAPTCHA → Tier Config → Troubleshooting
3. Host at root `/llms.txt`

**Phase 2 (Comprehensive - 2-3 hours):**
1. Generate `/llms-full.txt` by combining all docs/ files into single Markdown
2. Ensure consistent heading hierarchy (H1 title, H2 sections)
3. Verify code examples are complete (no truncated snippets)

**Phase 3 (Polish - 1 hour):**
1. Add meta descriptions: Each link in llms.txt gets 1-2 sentence summary
2. Validate links (all URLs must be accessible)
3. Test with Claude/ChatGPT: Load llms-full.txt, ask API questions

**Example llms.txt for glabs-sdk:**
```markdown
# GLABS SDK
> TypeScript SDK for Google Generative AI - Image/Video Gen, reCAPTCHA, Models

## Getting Started
- [Installation & Setup](docs/getting-started.mdx) - Dependencies, initialization, configuration
- [Client Configuration](docs/client.mdx) - Tier setup, API keys, environment variables

## Image Generation
- [Image Generation API](docs/image-generation.mdx) - Generate, edit, create variations with ImageFX

## Video Generation
- [Video Generation API](docs/video-generation.mdx) - Create video content with Veo model

## reCAPTCHA
- [reCAPTCHA Protection](docs/recaptcha.mdx) - Integrate reCAPTCHA v3, verify tokens

## Advanced
- [API Reference](docs/api-reference.mdx) - Complete method signatures and return types
- [Tier Configuration](docs/tier-config.mdx) - Billing tiers, rate limits, quotas
```

## Unresolved Questions

1. Should `/llms-full.txt` be generated at build time or serve-time? (Recommend build-time for CDN caching)
2. Do docs need versioning in llms.txt (e.g., v1/, v2/)? (Not needed if docs auto-update)
3. Should SDK README link to `/llms.txt`? (Yes—signals LLM-readiness to users)

## Resources & References

**Official Standards:**
- [llms.txt Official](https://llmstxt.org/)
- [GitHub: AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt)

**Implementation Guides:**
- [Rankability: LLMS.txt Best Practices](https://www.rankability.com/guides/llms-txt-best-practices/)
- [Mintlify: Simplifying Docs with /llms.txt](https://www.mintlify.com/blog/simplifying-docs-with-llms-txt)
- [GitBook: LLM-Ready Docs](https://gitbook.com/docs/publishing-documentation/llm-ready-docs)

**Company Implementations:**
- [Anthropic Claude Docs llms-full.txt](https://docs.claude.com/llms-full.txt)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [Stripe Building with LLMs](https://docs.stripe.com/building-with-llms)

**Community Directories:**
- [llms-txt.com/directory](https://llms-txt.com/directory) (788+ sites)
- [llmstxt.site](https://llmstxt.site/)
- [LLMs.txt Hub](https://llmstxthub.com/)

---

**Next Steps:** Implement Phase 1 (llms.txt) immediately, validate with Claude's context window, phase in llms-full.txt for comprehensive scenarios.
