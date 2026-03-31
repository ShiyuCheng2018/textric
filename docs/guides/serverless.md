# Serverless Deployment Guide

Textric runs anywhere JavaScript runs — including serverless environments like AWS Lambda, Cloudflare Workers, and Vercel Edge Functions. Each environment has different constraints around file systems, memory, and execution time. This guide covers the setup, gotchas, and best practices for each.

## General Concepts

Before diving into specific platforms, understand two things that matter in every serverless environment:

**Cold start vs warm start.** When a serverless function spins up for the first time (or after idle timeout), it must initialize everything: load the runtime, import modules, parse fonts. This is the cold start. Subsequent invocations reuse the same process — the warm start — and skip all that setup. Font parsing (~10-50ms per variant) happens once and stays in memory across warm invocations.

**Font loading strategy.** Bundle the fonts you need and load them from the local filesystem or in-memory buffers. Textric does not make any network requests — you provide font files, and Textric parses them.

---

## AWS Lambda

Lambda gives you a writable `/tmp` directory (512MB by default, up to 10GB) and supports both zip deployments and Docker images. This makes it the most flexible serverless platform for Textric.

### Recommended Setup

```typescript
// handler.ts
import { createMeasurer } from 'textric'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

// Initialize OUTSIDE the handler — persists across warm invocations
let measurer: Awaited<ReturnType<typeof createMeasurer>> | null = null

async function getMeasurer() {
  if (measurer) return measurer

  measurer = await createMeasurer({
    fonts: [
      { family: 'Inter', path: '/opt/fonts/inter-400.ttf', weight: 400 },
      { family: 'Inter', path: '/opt/fonts/inter-700.ttf', weight: 700 },
    ],
  })

  return measurer
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const m = await getMeasurer()

  const { text, font, size, maxWidth } = JSON.parse(event.body || '{}')

  const result = m.measure(text, {
    font: font || 'Inter',
    size: size || 16,
    maxWidth,
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  }
}
```

### Bundle Fonts in a Lambda Layer

Pre-bundle fonts in a Lambda Layer for easy reuse across functions:

```bash
# Create the layer structure
mkdir -p lambda-layer/fonts
cd lambda-layer/fonts

# Download the fonts you need
curl -o inter-400.ttf "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2"
curl -o inter-700.ttf "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2"

# Package the layer
cd ..
zip -r textric-fonts-layer.zip fonts/

# Deploy the layer
aws lambda publish-layer-version \
  --layer-name textric-fonts \
  --zip-file fileb://textric-fonts-layer.zip \
  --compatible-runtimes nodejs20.x
```

Then load from the layer path:

```typescript
const m = await createMeasurer({
  fonts: [
    { family: 'Inter', path: '/opt/fonts/inter-400.ttf', weight: 400 },
    { family: 'Inter', path: '/opt/fonts/inter-700.ttf', weight: 700 },
  ],
})
```

### Docker Image Deployment

For larger font sets or CJK fonts (which can be 16MB+ each), use Lambda's container image support:

```dockerfile
FROM public.ecr.aws/lambda/nodejs:20

# Copy fonts at build time
COPY fonts/ /var/task/fonts/

# Copy application code
COPY dist/ /var/task/
COPY package*.json /var/task/

RUN npm ci --production

CMD ["handler.handler"]
```

```typescript
const m = await createMeasurer({
  fonts: [
    { family: 'Noto Sans SC', path: '/var/task/fonts/noto-sans-sc-400.ttf', weight: 400 },
  ],
})
```

### Lambda Gotchas

- **Memory setting affects CPU.** Lambda allocates CPU proportional to memory. For font parsing, 512MB-1024MB is a good baseline. Below 256MB, `opentype.js` parsing slows noticeably.
- **Provisioned Concurrency eliminates cold starts.** If latency is critical, use provisioned concurrency to keep instances warm. The measurer stays initialized in memory.
- **Lambda Layer path is `/opt/`.** Files in your layer are mounted at `/opt/` — not in the function's working directory.

---

## Cloudflare Workers

Workers run on V8 isolates with **no file system**. There is no `/tmp`, no `fs` module, no disk cache. All fonts must be loaded as in-memory buffers.

### Constraints

| Resource | Free plan | Paid plan |
|----------|-----------|-----------|
| CPU time per request | 10ms | 30ms |
| Memory | 128MB | 128MB |
| Max worker size | 3MB (compressed) | 10MB (compressed) |

CPU time is the hard limit. Font parsing with `opentype.js` takes ~10-50ms, which means **you cannot parse fonts on every request on the free plan**. Even on the paid plan, it's tight. The solution: parse once and reuse across requests.

### Recommended Setup

Store fonts in Cloudflare KV or R2, and load them into the measurer at startup:

```typescript
// worker.ts
import { createMeasurer } from 'textric'

interface Env {
  FONT_BUCKET: R2Bucket
}

let measurer: Awaited<ReturnType<typeof createMeasurer>> | null = null

async function getMeasurer(env: Env) {
  if (measurer) return measurer

  // Fetch font binaries from R2
  const interRegular = await env.FONT_BUCKET.get('fonts/inter-400.ttf')
  const interBold = await env.FONT_BUCKET.get('fonts/inter-700.ttf')

  if (!interRegular || !interBold) {
    throw new Error('Font files not found in R2 bucket')
  }

  const [regularBuffer, boldBuffer] = await Promise.all([
    interRegular.arrayBuffer(),
    interBold.arrayBuffer(),
  ])

  measurer = await createMeasurer({
    fonts: [
      { family: 'Inter', data: Buffer.from(regularBuffer), weight: 400 },
      { family: 'Inter', data: Buffer.from(boldBuffer), weight: 700 },
    ],
  })

  return measurer
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const m = await getMeasurer(env)

    const { text, font, size, maxWidth } = await request.json<{
      text: string
      font?: string
      size?: number
      maxWidth?: number
    }>()

    const result = m.measure(text, {
      font: font || 'Inter',
      size: size || 16,
      maxWidth,
    })

    return Response.json(result)
  },
}
```

### Using KV Instead of R2

For smaller fonts (KV values are limited to 25MB):

```typescript
interface Env {
  FONTS: KVNamespace
}

async function getMeasurer(env: Env) {
  if (measurer) return measurer

  // KV returns ArrayBuffer with type: 'arrayBuffer'
  const regularBuffer = await env.FONTS.get('inter-400', { type: 'arrayBuffer' })
  const boldBuffer = await env.FONTS.get('inter-700', { type: 'arrayBuffer' })

  if (!regularBuffer || !boldBuffer) {
    throw new Error('Font files not found in KV')
  }

  measurer = await createMeasurer({
    fonts: [
      { family: 'Inter', data: Buffer.from(regularBuffer), weight: 400 },
      { family: 'Inter', data: Buffer.from(boldBuffer), weight: 700 },
    ],
  })

  return measurer
}
```

Upload fonts to KV:

```bash
# Upload font files to KV namespace
wrangler kv:key put --binding FONTS "inter-400" --path ./fonts/inter-400.ttf
wrangler kv:key put --binding FONTS "inter-700" --path ./fonts/inter-700.ttf
```

### Workers Gotchas

- **CPU time, not wall time.** The 10ms/30ms limit counts actual CPU execution, not time spent waiting for R2/KV. Font fetching from R2 doesn't count against CPU time, but `opentype.js` parsing does.
- **Global scope persists across requests** within the same isolate. The `measurer` variable in module scope survives across warm requests — this is critical for avoiding repeated font parsing.
- **No `Buffer` global.** Workers use the Web API. If Textric requires Node.js `Buffer`, you may need `node_compat = true` in `wrangler.toml`:
  ```toml
  # wrangler.toml
  node_compat = true
  ```
- **Bundle size limits.** A single `.ttf` font is typically 100-400KB. With 3MB compressed limit on the free plan, you can bundle ~3-5 fonts directly in the worker script if needed. For more fonts, use R2 or KV.
- **CJK fonts are too large.** Noto Sans SC (16MB+) won't fit in KV efficiently and parsing it will exceed CPU limits. Consider a different platform for CJK-heavy workloads.

---

## Vercel Edge Functions

Vercel Edge Functions run on a lightweight V8-based runtime (similar to Workers) with no file system access. However, you can import static assets bundled with your deployment.

### Recommended Setup

Bundle fonts as static imports:

```typescript
// api/measure.ts (Edge Function)
import { createMeasurer } from 'textric'

export const config = {
  runtime: 'edge',
}

let measurer: Awaited<ReturnType<typeof createMeasurer>> | null = null

async function getMeasurer() {
  if (measurer) return measurer

  // Fetch fonts bundled in the deployment's public/ directory
  // or from Vercel Blob Storage
  const [regularRes, boldRes] = await Promise.all([
    fetch(new URL('../../fonts/inter-400.ttf', import.meta.url)),
    fetch(new URL('../../fonts/inter-700.ttf', import.meta.url)),
  ])

  const [regularBuffer, boldBuffer] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ])

  measurer = await createMeasurer({
    fonts: [
      { family: 'Inter', data: Buffer.from(regularBuffer), weight: 400 },
      { family: 'Inter', data: Buffer.from(boldBuffer), weight: 700 },
    ],
  })

  return measurer
}

export default async function handler(request: Request) {
  const m = await getMeasurer()

  const { text, font, size, maxWidth } = await request.json()

  const result = m.measure(text, {
    font: font || 'Inter',
    size: size || 16,
    maxWidth,
  })

  return Response.json(result)
}
```

### Loading Fonts from Vercel Blob

For dynamic or large font sets, use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob):

```typescript
import { createMeasurer } from 'textric'

async function getMeasurer() {
  if (measurer) return measurer

  // Fetch from Vercel Blob Storage
  const [regularRes, boldRes] = await Promise.all([
    fetch('https://your-blob-store.public.blob.vercel-storage.com/fonts/inter-400.ttf'),
    fetch('https://your-blob-store.public.blob.vercel-storage.com/fonts/inter-700.ttf'),
  ])

  const [regularBuffer, boldBuffer] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ])

  measurer = await createMeasurer({
    fonts: [
      { family: 'Inter', data: Buffer.from(regularBuffer), weight: 400 },
      { family: 'Inter', data: Buffer.from(boldBuffer), weight: 700 },
    ],
  })

  return measurer
}
```

### Using Vercel Serverless Functions (Node.js Runtime) Instead

If you need file system access or heavier processing, use Vercel's Node.js runtime instead of Edge:

```typescript
// api/measure.ts (Node.js Serverless Function)
import { createMeasurer } from 'textric'
import path from 'path'
import type { VercelRequest, VercelResponse } from '@vercel/node'

let measurer: Awaited<ReturnType<typeof createMeasurer>> | null = null

async function getMeasurer() {
  if (measurer) return measurer

  measurer = await createMeasurer({
    fonts: [
      // Fonts bundled in the deployment
      { family: 'Inter', path: path.join(process.cwd(), 'fonts/inter-400.ttf'), weight: 400 },
      { family: 'Inter', path: path.join(process.cwd(), 'fonts/inter-700.ttf'), weight: 700 },
    ],
  })

  return measurer
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const m = await getMeasurer()

  const { text, font, size, maxWidth } = req.body

  const result = m.measure(text, {
    font: font || 'Inter',
    size: size || 16,
    maxWidth,
  })

  return res.json(result)
}
```

### Vercel Gotchas

- **Edge Functions have a 128KB code size limit** after bundling (excluding static assets loaded via `fetch`). Keep your function code lean and load fonts at runtime.
- **No `fs` module in Edge runtime.** Use `fetch()` with relative or absolute URLs to load bundled assets.
- **Execution time limit: 30s** (hobby plan) or **300s** (pro plan) for Edge Functions. Font initialization is well within this.
- **Cold starts are faster than Lambda** — V8 isolates spin up in ~5ms. The main cost is font parsing, not runtime initialization.
- **Prefer Edge for simple measurement endpoints, Node.js runtime for heavy workloads.** If you need CJK subsetting or many font variants, the Node.js runtime gives you `/tmp` and more memory.

---

## Platform Comparison

| | AWS Lambda | Cloudflare Workers | Vercel Edge | Vercel Serverless |
|--|-----------|-------------------|-------------|-------------------|
| **File system** | `/tmp` (512MB-10GB) | None | None | `/tmp` |
| **Font loading** | Layer, Docker, or local path | KV, R2, or bundled buffer | `fetch()` or Blob buffer | Local path |
| **Cold start** | 200-800ms | ~5ms | ~5ms | 200-500ms |
| **Memory** | 128MB-10GB | 128MB | 128MB | 128MB-3GB |
| **Max execution** | 15 min | 30s (10ms/30ms CPU) | 30s-300s | 10s-300s |
| **CJK support** | Good (Docker) | Limited (font size) | Limited | Good |
| **Best for** | Heavy workloads, CJK | Low-latency, simple | Low-latency, simple | Full Node.js features |

---

## Best Practices

### 1. Always initialize outside the handler

This is the single most important optimization. The measurer and its parsed fonts persist across warm invocations on every platform:

```typescript
// Module scope — survives across requests
let measurer = null

async function getMeasurer() {
  if (measurer) return measurer
  measurer = await createMeasurer({ ... })
  return measurer
}

// Handler — called per request
export async function handler(event) {
  const m = await getMeasurer()  // instant on warm starts
  // ...
}
```

### 2. Bundle fonts in your deployment

Since Textric does not download fonts at runtime, always include font files in your deployment (Docker image, Lambda Layer, or fetched from object storage at startup).

### 3. Tune the LRU cache size

Textric's in-memory font cache defaults to 100 variants. In serverless environments with 128MB memory, tune it down if you're loading many fonts:

```typescript
const m = await createMeasurer({
  fonts: [...],
  // Each parsed font uses ~1-5MB of memory depending on glyph count.
  // With 128MB total, keep this conservative.
})
```

A typical Latin font (Inter, Roboto) uses ~1-2MB in memory after parsing. CJK fonts (Noto Sans SC) can use 10-20MB. Plan accordingly.

### 4. Use `measureBatch` for multiple texts

If your endpoint measures multiple text elements (e.g., a full card layout), use `measureBatch` to share font lookup overhead:

```typescript
const results = m.measureBatch([
  { text: title, font: 'Inter', size: 20, weight: 700 },
  { text: subtitle, font: 'Inter', size: 14, maxWidth: 300 },
  { text: body, font: 'Inter', size: 14, maxWidth: 300, lineHeight: 1.5 },
])
```

### 5. Handle cold starts gracefully

For latency-sensitive APIs, consider returning a degraded response during cold start rather than making the user wait:

```typescript
export async function handler(event) {
  const m = await getMeasurer()

  const result = m.measure(text, options)

  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
      // Tell clients to cache measurement results
      'Cache-Control': 'public, max-age=3600',
    },
  }
}
```

## Next Steps

- [Performance Guide](./performance.md) — general optimization tips
- [API Reference](../api/measurer.md) — complete API documentation
- [Getting Started](./getting-started.md) — basic usage
