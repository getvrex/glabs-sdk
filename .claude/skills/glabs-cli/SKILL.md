---
name: glabs-cli
description: Use when working with the glabs CLI — the command-line interface for @getvrex/glabs-sdk. Covers all commands (auth, config, images, videos, projects, whisk, serve), option flags, configuration, environment variables, and typical workflows for AI media generation via Google Labs APIs (Imagen 4, Veo 3).
---

# glabs CLI Skill

The `glabs` CLI provides terminal-based access to all @getvrex/glabs-sdk features — image generation (Imagen 4), video generation (Veo 3/3.1), project management, Whisk (Imagen 3.5), and an OpenAI-compatible server.

## Installation

### Install the CLI

```bash
npm install -g @getvrex/glabs-cli
```

This installs the `glabs` command globally. The CLI package is a thin wrapper around `@getvrex/glabs-sdk`.

### Install as SDK (library usage)

```bash
npm install @getvrex/glabs-sdk
```

### Install this skill (for Claude Code)

```bash
curl -fsSL https://raw.githubusercontent.com/getvrex/glabs-sdk/main/scripts/install-skill.sh | bash
```

Or manually copy `.claude/skills/glabs-cli/` into your project's `.claude/skills/` directory.

## Quick Reference

```
glabs <command> [subcommand] [options]

Commands:
  auth      extract             Extract tokens via Browserless
  config    show | set          Manage CLI configuration
  projects  list | get          Manage projects
  images    generate | upload | upsample | credits
  videos    generate | i2v | r2v | extend | reshoot | upsample | status | poll
  whisk     generate            Whisk image generation (Imagen 3.5)
  serve                         Start OpenAI-compatible server

Global:
  --help, -h      Show help
  --version, -v   Show version
```

## Architecture

- Entry: `src/cli/cli-entry.ts` — argv dispatch, .env loader
- Config: `src/cli/cli-config.ts` — `~/.glabs/config.json` + env overrides
- Client: `src/cli/cli-client.ts` — GLabsClient/WhiskService factory
- Output: `src/cli/cli-output.ts` — printing, file saving, progress helpers
- Commands: `src/cli/cmd-{auth,config,images,videos,projects,whisk,serve}.ts`

All commands use `node:util/parseArgs` for option parsing with `strict: true`.

## Configuration

Config file: `~/.glabs/config.json`

### Environment Variable Overrides (take precedence over file)

| Variable | Config Key |
|----------|------------|
| `GLABS_BEARER_TOKEN` | `bearerToken` |
| `GLABS_SESSION_TOKEN` | `sessionToken` |
| `GLABS_ACCOUNT_TIER` | `accountTier` |
| `GLABS_PROJECT_ID` | `projectId` |
| `GLABS_RECAPTCHA_PROVIDER` | `recaptchaProvider` |
| `GLABS_RECAPTCHA_API_KEY` | `recaptchaApiKey` |
| `GLABS_WHISK_COOKIE` | `whiskCookie` |
| `GLABS_OUTPUT_DIR` | `outputDir` |
| `GLABS_GOOGLE_EMAIL` | `googleEmail` |
| `GLABS_GOOGLE_PASSWORD` | `googlePassword` |
| `GLABS_BROWSERLESS_TOKEN` | `browserlessToken` |

### CliConfig type

```typescript
type CliConfig = {
  bearerToken?: string;
  sessionToken?: string;
  accountTier?: 'pro' | 'ultra';
  projectId?: string;
  recaptchaProvider?: RecaptchaProvider;
  recaptchaApiKey?: string;
  whiskCookie?: string;
  outputDir?: string;
  googleEmail?: string;
  googlePassword?: string;
  browserlessToken?: string;
};
```

## Detailed references

See `references/` for per-command details:
- `references/commands-reference.md` — complete flag/option reference for every command
- `references/development-guide.md` — patterns for adding new CLI commands
