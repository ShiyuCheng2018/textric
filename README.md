# Textric

**Text layout for AI. Line wrapping, rich text, and precise metrics — pure JS, no browser.**

When AI generates visual content — UI designs, slides, PDFs, social images — it needs to know exactly how text will look: how wide, how many lines, where it wraps. But AI runs on servers, not in browsers. There's no Canvas, no DOM, no `measureText()`.

Textric solves this. It parses font files directly in pure JavaScript and computes pixel-accurate text layout — line wrapping, rich text, and precise metrics — anywhere JS runs.

```typescript
import { createMeasurer } from 'textric'

const m = await createMeasurer({
  fonts: [{ family: 'Inter', path: './fonts/Inter-Regular.ttf' }]
})

// "Will this headline fit in a 280px card?"
const result = m.measure('AI-Generated Dashboard Title', {
  font: 'Inter',
  size: 18,
  weight: 700,
  maxWidth: 280,
  lineHeight: 1.4,
})

result.width          // 266 — widest line in pixels
result.lineCount      // 2
result.truncated      // false — it fits
result.lines          // ['AI-Generated Dashboard', 'Title']
```

## The Problem

AI is increasingly generating visual content, not just code:

```
Before  AI generates code → browser renders it → layout is the browser's job
Now     AI generates UI directly → computes layout on server → needs text layout
Next    AI agents create slides, reports, emails, posters → all server-side → all need this
```

Every time AI places text in a bounding box, it needs to answer: **"Does this text fit? Where does it wrap? How tall is it?"** Without a browser, that question had no good answer — until now.

## Why Textric?

Text layout happens at three layers, from most coupled to most portable:

```
DOM reflow          getBoundingClientRect()     browser only, slow
Canvas API          ctx.measureText()           browser only, fast (Pretext)
Font file parsing   font.getAdvanceWidth()      runs anywhere, fast (Textric)
```

[Pretext](https://github.com/chenglou/pretext) made a breakthrough by moving layout from Layer 3 to Layer 2 — eliminating expensive DOM reflow. But it still needs a browser's Canvas API.

Textric goes one layer deeper. It reads font binary files directly with [opentype.js](https://github.com/opentypejs/opentype.js), extracting glyph widths and kerning pairs — the same data browsers use internally, but without needing a browser at all.

**Use Pretext in the browser. Use Textric everywhere else.**

## Features

- **Pure JavaScript** — no Canvas, no DOM, no native dependencies (no Cairo, no Pango), no network I/O
- **Runs anywhere** — Node.js, Bun, Deno, Cloudflare Workers, AWS Lambda, AI sandboxes
- **Load fonts your way** — from local files, in-memory buffers, or any source you control
- **Multi-line wrapping** — CJK character-level + Latin word-boundary breaking
- **Truncation detection** — `maxLines`, `maxHeight`, reports `truncated` + `totalLineCount`
- **Indent support** — first-line indent and hanging indent for bullet lists and paragraphs
- **Rich text** — measure mixed fonts, sizes, and weights in a single paragraph with per-fragment positioning
- **Shrink wrap** — find the optimal container width for a given line count
- **Batch measurement** — measure an entire page of text in one call
- **Kerning-accurate** — real font kerning pairs, not character-width guessing

## Installation

```bash
npm install textric
```

## Quick Start

### AI generating a card layout

```typescript
import { createMeasurer } from 'textric'

const m = await createMeasurer({
  fonts: [
    { family: 'Inter', path: './fonts/Inter-Regular.ttf' },
    { family: 'Inter', path: './fonts/Inter-Bold.ttf', weight: 700 },
  ]
})

// AI needs to size a card's text elements
const title = m.measure('Weekly Revenue Report', {
  font: 'Inter', size: 20, weight: 700,
})

const body = m.measure(
  'Revenue increased 23% compared to last week, driven primarily by the new subscription tier launched on Tuesday.',
  { font: 'Inter', size: 14, maxWidth: 300, lineHeight: 1.5 }
)

// Now AI knows exact dimensions to create the layout
const cardHeight = 24 + title.height + 16 + body.height + 24
//                 padding  title     gap    body      padding
```

### Batch measurement for a full page

```typescript
// AI generated a page with 20 text elements — measure them all at once
const results = m.measureBatch([
  { text: 'Dashboard', font: 'Inter', size: 24, weight: 700 },
  { text: 'Welcome back, Alex', font: 'Inter', size: 14 },
  { text: '$12,450', font: 'Inter', size: 32, weight: 700 },
  { text: 'Revenue this month', font: 'Inter', size: 12 },
  // ... 16 more text elements
])
// Font loaded once, all 20 measured in ~2ms
```

### Shrink wrap — find optimal width

```typescript
// "What's the narrowest container that fits this text in 2 lines?"
const { width } = m.shrinkWrap('AI-Powered Analytics Dashboard', {
  font: 'Inter', size: 18, weight: 700, maxLines: 2,
})
// → { width: 186 } — the tightest fit
```

### Truncation detection

```typescript
const result = m.measure(aiGeneratedDescription, {
  font: 'Inter', size: 14, maxWidth: 300, maxLines: 3,
})

if (result.truncated) {
  // AI should shorten the text or expand the container
  console.log(`Text needs ${result.totalLineCount} lines, only showing ${result.lineCount}`)
}
```

### Local font files

```typescript
const m = await createMeasurer({
  fonts: [
    { family: 'BrandFont', path: './fonts/brand-regular.ttf' },
    { family: 'BrandFont', path: './fonts/brand-bold.ttf', weight: 700 },
  ]
})
```

### Rich text — mixed fonts in one paragraph

```typescript
// Price tag: small "$", large "49", small ".99"
const price = m.measureRichText([
  { text: '$', font: 'Inter', size: 14, weight: 400 },
  { text: '49', font: 'Inter', size: 32, weight: 700 },
  { text: '.99', font: 'Inter', size: 14, weight: 400 },
])
// price.width → total width with mixed sizing
// price.lines[0].fragments → 3 fragments, each with x/width for positioning

// Paragraph with inline bold, wrapped in a container
const result = m.measureRichText(
  [
    { text: 'Your plan ', font: 'Inter', size: 14, weight: 400 },
    { text: 'Pro', font: 'Inter', size: 14, weight: 700 },
    { text: ' renews on ', font: 'Inter', size: 14, weight: 400 },
    { text: 'April 30', font: 'Inter', size: 14, weight: 700 },
    { text: '.', font: 'Inter', size: 14, weight: 400 },
  ],
  { maxWidth: 280, lineHeight: 1.5 },
)
// result.lines → each line has positioned fragments with font/size/weight
```

## How It Works

```
Font file (.ttf / .woff)
  → opentype.js parses binary data
    → glyph table + kerning pairs
      → getAdvanceWidth(text, fontSize, { kerning: true })
        → pixel-accurate width
          → wrapText() for multi-line layout
            → lines, lineCount, height, truncated
```

Textric reads the same glyph metrics that browsers use internally for text layout. The difference: browsers access this data through Canvas API (which requires a browser), while Textric reads it directly from the font file (which works anywhere).

## Performance

Font loading is a one-time cost. After that, layout and measurement are sub-millisecond for single-line and scale linearly with text length.

| Operation | Time | Notes |
|-----------|------|-------|
| Cold start (createMeasurer + first measure) | **~5ms** | From buffer. One-time per process. |
| Single-line measurement | **< 0.01ms** | 120K+ ops/sec. Font in memory. |
| Multi-line wrap, 160 chars | **~0.36ms** | Includes wrapping computation. |
| Multi-line wrap, 1000 chars | **~2.3ms** | Scales linearly with text length. |
| Batch 1,000 items | **~94ms** | Mixed single/multi-line items. |
| Batch 10,000 items | **~946ms** | Font loaded once, shared across all items. |
| Batch 20,000 items | **~1.9s** | Sustained ~10,800 items/sec. |
| Textric overhead vs raw opentype.js | **~1.0x** | Near-zero overhead for single-line. |

See [benchmarks/PERFORMANCE.md](./benchmarks/PERFORMANCE.md) for detailed results including scaling curves, rich text, memory, and CJK performance. Run `pnpm bench:report` to generate results on your machine.

## Comparison

| | Pretext | node-canvas | Satori | **Textric** |
|--|---------|-------------|--------|-------------|
| **Environment** | Browser only | Node.js | Node.js / Edge | **Node.js / Bun / Deno / Edge** |
| **Native deps** | None (browser API) | Cairo + Pango | None | **None** |
| **Does** | Measure + layout | Canvas API | JSX → SVG render | **Measure + layout** |
| **Google Fonts** | No | No | Yes | No (bring your own fonts) |
| **Multi-line** | Yes | Manual | Yes (via flexbox) | **Yes** |
| **Network I/O** | N/A (browser) | N/A | Yes | **None** |
| **Weight** | ~5KB | ~50MB (with Cairo) | ~2MB | **~2MB** |
| **Best for** | Browser perf | Full Canvas API | OG images | **AI layout, text metrics** |

## Use Cases

**AI & Generative**
- AI design tools — compute text layout in sandboxes without a browser
- AI slide/report generators — line wrapping and text placement for PDF/image output
- AI email builders — validate text fits within template constraints

**Server-Side Rendering**
- OG image generation — text layout without Puppeteer overhead
- PDF generation — accurate multi-line text placement
- SSR/SSG — pre-compute dimensions to prevent CLS

**Developer Tooling**
- CI/CD — automated text overflow detection
- Design token validation — verify text fits component boundaries
- Edge functions — text layout in Cloudflare Workers / Vercel Edge

## API Reference

See [docs/api](./docs/api/) for the complete API reference.

| Function | Description |
|----------|-------------|
| `createMeasurer(options)` | Create a measurer with pre-loaded fonts |
| `m.measure(text, options)` | Measure and wrap text |
| `m.measureBatch(items)` | Measure multiple texts in one call |
| `m.measureRichText(spans, options?)` | Measure mixed-style text with per-fragment positioning |
| `m.shrinkWrap(text, options)` | Find optimal container width |
| `m.fitText(text, options)` | Find optimal font size for a container |
| `m.estimateCharCount(options)` | Estimate how many characters fit in a width |
| `m.loadFont(fontSource)` | Load a font from path or Buffer |
| `m.getFontInfo(family)` | Get available weights and styles |
| `m.getFontMetrics(font, size)` | Get detailed font metrics (ascent, descent, underline) |

## Limitations

- **No RTL/BiDi layout** — Textric measures text width accurately for any script, but does not reorder bidirectional text. For RTL rendering, handle bidi reordering separately.
- **Emoji width may vary** — emoji rendering is platform-dependent. Textric measures based on font glyph data, which may differ slightly from browser rendering.
- **Variable fonts (.ttf with fvar)** — not yet supported. Use static font files for now.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](./LICENSE)
