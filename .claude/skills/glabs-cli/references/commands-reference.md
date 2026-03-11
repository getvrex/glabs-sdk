# glabs CLI Commands Reference

## auth

### auth extract
Extract bearer + session tokens via Browserless or local browser.

```bash
glabs auth extract --email user@gmail.com --password "pass" --save
glabs auth extract --email user@gmail.com --password "pass" --browserless-token "tok"
```

| Option | Description |
|--------|-------------|
| `--email <email>` | Google email (or `GLABS_GOOGLE_EMAIL`) |
| `--password <password>` | Google password (or `GLABS_GOOGLE_PASSWORD`) |
| `--browserless-token <tok>` | Browserless.io token (omit for local browser) |
| `--save` | Save extracted tokens to `~/.glabs/config.json` |

Output: bearer-token, session-token, credits, tier, expiry times.

## config

### config show
Display current config with tokens masked.

```bash
glabs config show
```

### config set
Set one or more config values.

```bash
glabs config set --bearer-token "tok" --session-token "stok" --account-tier pro
glabs config set --recaptcha-provider chrome --recaptcha-api-key "key"
glabs config set --output-dir ./output
glabs config set --whisk-cookie "cookie"
```

| Option | Description |
|--------|-------------|
| `--bearer-token <token>` | Bearer auth token |
| `--session-token <token>` | Session token for auto-refresh |
| `--account-tier <pro\|ultra>` | Account tier |
| `--project-id <id>` | Default project ID |
| `--recaptcha-provider <provider>` | chrome, yescaptcha, playwright, etc. |
| `--recaptcha-api-key <key>` | reCAPTCHA API key |
| `--whisk-cookie <cookie>` | Cookie for Whisk API |
| `--output-dir <path>` | Default output directory |

## projects

### projects list

```bash
glabs projects list
glabs projects list --page-size 50 --json
```

| Option | Description |
|--------|-------------|
| `--page-size <n>` | Results per page (default: 20) |
| `--json` | Raw JSON output |

### projects get

```bash
glabs projects get <project-id>
glabs projects get <project-id> --json
```

## images

### images generate

```bash
glabs images generate -p "A sunset over mountains" -a 16:9
glabs images generate -p "A robot" -n 4 -m nanobanana2 --seed 42
glabs images generate -p "Style transfer" --reference-media-id abc --reference-media-id def
```

| Option | Description |
|--------|-------------|
| `-p, --prompt <text>` | Image prompt (required) |
| `-a, --aspect-ratio <ratio>` | `16:9` \| `9:16` \| `1:1` (default: `1:1`) |
| `-n, --count <n>` | Number of images 1-4 (default: 1) |
| `-m, --model <name>` | `nanobananapro` \| `nanobanana2` \| `imagen-4` \| `imagen-4-fast` \| `imagen-4-ultra` |
| `--seed <n>` | Random seed |
| `--reference-media-id <id>` | Reference media ID (repeatable) |
| `--reference-media-generation-id <id>` | Reference mediaGenerationId (repeatable) |
| `-o, --output-dir <path>` | Output dir (default: `./output`) |
| `--json` | Raw JSON output |

### images upload

```bash
glabs images upload -f photo.jpg
glabs images upload -f photo.jpg --json
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Image file path (required) |
| `--json` | Raw JSON output |

Output: media-id, media-generation-id.

### images upsample

```bash
glabs images upsample --media-id "abc123" --resolution 4K
glabs images upsample --media-id "abc123" --resolution 2K -o ./upscaled
```

| Option | Description |
|--------|-------------|
| `--media-id <id>` | Media ID (required) |
| `--resolution <res>` | `2K` \| `4K` (default: `4K`) |
| `-o, --output-dir <path>` | Output dir |
| `--json` | Raw JSON output |

### images credits

```bash
glabs images credits
glabs images credits --json
```

## videos

### videos generate (text-to-video)

```bash
glabs videos generate -p "A cinematic drone shot" -a 16:9
glabs videos generate -p "A cityscape" --mode fast --account-tier ultra
```

| Option | Description |
|--------|-------------|
| `-p, --prompt <text>` | Video prompt (required) |
| `-a, --aspect-ratio <ratio>` | `16:9` \| `9:16` \| `1:1` (default: `16:9`) |
| `--mode <quality\|fast>` | Video mode |
| `--account-tier <pro\|ultra>` | Override tier |
| `--seed <n>` | Random seed |
| `--json` | Raw JSON output |

Output: operation name, media-id, status.

### videos i2v (image-to-video)

```bash
glabs videos i2v -p "Camera pans slowly" --start-media-id "abc123"
glabs videos i2v -p "Motion" --start-media-id "abc" --end-media-id "xyz"
```

| Option | Description |
|--------|-------------|
| `-p, --prompt <text>` | Video prompt (required) |
| `--start-media-id <id>` | Start frame media ID (required) |
| `--end-media-id <id>` | End frame media ID (first+last frame mode) |
| `-a, --aspect-ratio` | `16:9` \| `9:16` \| `1:1` |
| `--mode <quality\|fast>` | Video mode |
| `--account-tier <pro\|ultra>` | Override tier |
| `--seed <n>` | Random seed |
| `--json` | Raw JSON output |

### videos r2v (reference-images-to-video)

```bash
glabs videos r2v -p "A scene with these characters" --ref-media-id abc --ref-media-id def
```

| Option | Description |
|--------|-------------|
| `-p, --prompt <text>` | Video prompt (required) |
| `--ref-media-id <id>` | Reference image media ID (required, repeatable, 1-3) |
| `-a, --aspect-ratio` | `16:9` \| `9:16` \| `1:1` |
| `--mode <quality\|fast>` | Video mode |
| `--account-tier <pro\|ultra>` | Override tier |
| `--seed <n>` | Random seed |
| `--json` | Raw JSON output |

### videos extend

```bash
glabs videos extend --media-id "abc123" -p "Continue with a sunset"
```

| Option | Description |
|--------|-------------|
| `--media-id <id>` | Video media ID (required) |
| `-p, --prompt <text>` | Extension prompt (required) |
| `-a, --aspect-ratio` | `16:9` \| `9:16` \| `1:1` |
| `--mode <quality\|fast>` | Video mode |
| `--account-tier <pro\|ultra>` | Override tier |
| `--seed <n>` | Random seed |
| `--json` | Raw JSON output |

### videos reshoot

```bash
glabs videos reshoot --media-id "abc123" --motion-type RESHOOT_MOTION_TYPE_FORWARD
```

| Option | Description |
|--------|-------------|
| `--media-id <id>` | Video media ID (required) |
| `--motion-type <type>` | Camera motion type (required) |
| `-a, --aspect-ratio` | `16:9` \| `9:16` \| `1:1` |
| `--seed <n>` | Random seed |
| `--json` | Raw JSON output |

**Motion types** (all prefixed `RESHOOT_MOTION_TYPE_`):
- Camera: `UP`, `DOWN`, `LEFT_TO_RIGHT`, `RIGHT_TO_LEFT`, `FORWARD`, `BACKWARD`, `DOLLY_IN_ZOOM_OUT`, `DOLLY_OUT_ZOOM_IN_LARGE`
- Stationary: `STATIONARY_UP`, `STATIONARY_DOWN`, `STATIONARY_LEFT_LARGE`, `STATIONARY_RIGHT_LARGE`, `STATIONARY_DOLLY_IN_ZOOM_OUT`, `STATIONARY_DOLLY_OUT_ZOOM_IN_LARGE`

### videos upsample

```bash
glabs videos upsample --media-id "abc123" --resolution 4k
```

| Option | Description |
|--------|-------------|
| `--media-id <id>` | Video media ID (required) |
| `--resolution <1080p\|4k>` | Resolution (default: `4k`) |
| `--json` | Raw JSON output |

### videos status

```bash
glabs videos status --operation-name "operations/xyz"
glabs videos status --media-id "abc123"
```

| Option | Description |
|--------|-------------|
| `--operation-name <name>` | Operation name |
| `--media-id <id>` | Media ID |
| `--project-id <id>` | Project ID |
| `--json` | Raw JSON output |

### videos poll

Poll until completion + auto-download video.

```bash
glabs videos poll --operation-name "operations/xyz" -o ./videos
glabs videos poll --media-id "abc123"
```

| Option | Description |
|--------|-------------|
| `--operation-name <name>` | Operation name |
| `--media-id <id>` | Media ID |
| `--project-id <id>` | Project ID |
| `-o, --output-dir <path>` | Output dir (default: `./output`) |
| `--json` | Raw JSON output |

## whisk

### whisk generate

```bash
glabs whisk generate -p "A cute robot" -a LANDSCAPE -o ./whisk-output
```

| Option | Description |
|--------|-------------|
| `-p, --prompt <text>` | Image prompt (required) |
| `-a, --aspect-ratio` | `SQUARE` \| `PORTRAIT` \| `LANDSCAPE` (also `1:1`, `9:16`, `16:9`) |
| `--seed <n>` | Random seed |
| `-o, --output-dir <path>` | Output dir |
| `--json` | Raw JSON output |

Requires `whiskCookie` set in config.

## serve

Start OpenAI-compatible HTTP server.

```bash
glabs serve
glabs serve --port 3000 --host 127.0.0.1 --api-key "sk-my-key" --max-concurrent 8
```

| Option | Description |
|--------|-------------|
| `--port <n>` | Listen port (default: `8000`) |
| `--host <addr>` | Bind host (default: `0.0.0.0`) |
| `--api-key <key>` | Optional API key for auth |
| `--max-concurrent <n>` | Max concurrent generation tasks (default: `4`) |

Endpoints: `POST /v1/chat/completions`, `GET /v1/models`.

## Output Files

Default output dir: `./output` (or `--output-dir` / config `outputDir`).

| Type | Filename Pattern |
|------|-----------------|
| Images | `image-{timestamp}.png` |
| Videos | `video-{timestamp}.mp4` |
| Whisk | `whisk-{timestamp}.png` |
| Upsampled | `upsample-{timestamp}.png` |

Use `--json` on any command to output raw JSON to stdout instead.
