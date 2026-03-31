# Loading Fonts

Textric loads fonts from local files or in-memory buffers. There is no built-in network I/O — you provide the font files, Textric parses them.

## From Local Files

The most common approach. Point Textric to `.ttf`, `.woff`, or `.otf` files on disk:

```typescript
import { createMeasurer } from 'textric'

const m = await createMeasurer({
  fonts: [
    { family: 'Inter', path: './fonts/Inter-Regular.ttf' },
    { family: 'Inter', path: './fonts/Inter-Bold.ttf', weight: 700 },
    { family: 'Roboto', path: './fonts/Roboto-Regular.ttf' },
  ]
})
```

## From Buffers

Load font data from any source (fetch, S3, database, etc.) and pass it as a Buffer:

```typescript
import { readFileSync } from 'fs'

const m = await createMeasurer({
  fonts: [
    { family: 'MyFont', data: readFileSync('./my-font.ttf'), weight: 400 },
  ]
})
```

This is useful for:
- Edge runtimes without a filesystem (Cloudflare Workers, Vercel Edge)
- Fonts stored in cloud storage (S3, R2, Supabase Storage)
- Fonts fetched from a CDN at startup

```typescript
// Example: fetch a font from your CDN, then pass it to Textric
const res = await fetch('https://cdn.example.com/fonts/brand-regular.ttf')
const buffer = Buffer.from(await res.arrayBuffer())

const m = await createMeasurer({
  fonts: [
    { family: 'Brand', data: buffer, weight: 400 },
  ]
})
```

## Loading Fonts at Runtime

Use `loadFont()` to add fonts after the measurer is created:

```typescript
const m = await createMeasurer({
  fonts: [{ family: 'Inter', path: './fonts/Inter-Regular.ttf' }]
})

// Later, load another font
await m.loadFont({ family: 'Poppins', path: './fonts/Poppins-SemiBold.ttf', weight: 600 })

// Now you can measure with Poppins
const result = m.measure('Hello', { font: 'Poppins', size: 16, weight: 600 })
```

## Using Google Fonts Files

Google Fonts provides free font files. Download them manually and bundle with your project:

1. Visit [Google Fonts](https://fonts.google.com/) and download the font family
2. Place the `.ttf` files in your project (e.g., `./fonts/`)
3. Load them as local files:

```typescript
const m = await createMeasurer({
  fonts: [
    { family: 'Poppins', path: './fonts/Poppins-Regular.ttf' },
    { family: 'Poppins', path: './fonts/Poppins-Bold.ttf', weight: 700 },
  ]
})
```

For Docker deployments, include fonts in your image:

```dockerfile
COPY fonts/ /app/fonts/
```

## Font Weight Matching

If you request a weight that isn't loaded, Textric finds the closest available weight:

```
Request: Inter 450
Available: [400, 700]
Selected: 400 (closest below)
```

Fallback priority:
1. Exact match
2. Same style, closest weight
3. Opposite style, closest weight
4. If no variant of the family is loaded, throws `FontNotFoundError`

For best accuracy, load the exact weights you need.

## Available Weights & Styles

Check what's available for a loaded font:

```typescript
const info = m.getFontInfo('Inter')
console.log(info.weights)  // [400, 700]
console.log(info.styles)   // ['normal']
```

## Deployment Patterns

### Bundle fonts in Docker

```dockerfile
FROM node:20-slim
COPY fonts/ /app/fonts/
COPY dist/ /app/
COPY package*.json /app/
WORKDIR /app
RUN npm ci --production
CMD ["node", "dist/index.js"]
```

```typescript
const m = await createMeasurer({
  fonts: [
    { family: 'Inter', path: '/app/fonts/Inter-Regular.ttf' },
    { family: 'Inter', path: '/app/fonts/Inter-Bold.ttf', weight: 700 },
  ]
})
```

### Edge runtimes (no filesystem)

Fetch font buffers at startup and pass them in-memory:

```typescript
const m = await createMeasurer({
  fonts: [
    { family: 'Inter', data: await fetchFontBuffer('Inter', 400) },
  ]
})
```

### AI sandboxes (E2B, etc.)

Pre-install fonts in the sandbox template image:

```dockerfile
COPY fonts/ /app/fonts/
```

Then load from the known path at runtime.
