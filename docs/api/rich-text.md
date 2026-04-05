# API Reference: Rich Text

Rich text layout lets you measure and wrap text that uses **multiple fonts, sizes, and weights in a single paragraph**. This is the feature you reach for when building price tags, styled headlines, or any layout where a single `measure()` call per paragraph isn't enough.

## `m.measureRichText(spans, options?)`

Measure a sequence of styled text spans and lay them out as a single paragraph. Synchronous after fonts are loaded.

```typescript
import { createMeasurer } from 'textric'

const m = await createMeasurer({
  fonts: [
    { family: 'Inter', path: './fonts/Inter-Regular.ttf' },
    { family: 'Inter', path: './fonts/Inter-Bold.ttf', weight: 700 },
  ],
})

const result = m.measureRichText(
  [
    { text: 'Hello ', font: 'Inter', size: 16, weight: 700 },
    { text: 'World', font: 'Inter', size: 16, weight: 400 },
  ],
  { maxWidth: 300, lineHeight: 1.4 },
)

result.width       // widest line in pixels
result.height      // total height
result.lines       // array of RichTextLine (with per-fragment positioning)
result.truncated   // whether text was truncated
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `spans` | `RichTextSpan[]` | Ordered list of styled text segments |
| `options` | `RichTextOptions` | Layout constraints (optional) |

### RichTextSpan

Each span describes a run of text with its own styling. Spans are concatenated left-to-right to form a single paragraph.

```typescript
interface RichTextSpan {
  text: string             // The text content
  font: string             // Font family name
  size: number             // Font size in pixels
  weight?: number          // Font weight (100-900). Default: 400
  style?: 'normal' | 'italic'  // Font style. Default: 'normal'
  letterSpacing?: number   // Extra letter spacing in pixels. Default: 0
}
```

### RichTextOptions

```typescript
interface RichTextOptions {
  maxWidth?: number    // Maximum line width in pixels. Enables multi-line wrapping.
  lineHeight?: number  // Line height **multiplier** (e.g. 1.4 = fontSize * 1.4 px). NOT pixels. Default: 1.2
  maxLines?: number    // Maximum number of visible lines. Only effective when maxWidth is set.
  maxHeight?: number   // Maximum visible height in pixels. Only effective when maxWidth is set.
}
```

When `maxWidth` is omitted, the entire text is laid out on a single line.

### RichTextResult

```typescript
interface RichTextResult {
  width: number              // Width of the widest line in pixels
  height: number             // Total height of visible lines
  lines: RichTextLine[]      // Per-line layout data with fragment positioning
  lineCount: number          // Number of visible lines
  totalLineCount: number     // Total lines before truncation
  truncated: boolean         // Whether text was truncated by maxLines/maxHeight
}
```

### RichTextLine

Each line contains positioned fragments, vertical metrics, and an absolute `y` coordinate.

```typescript
interface RichTextLine {
  fragments: RichTextLineFragment[]  // Positioned text fragments on this line
  width: number                      // Total width of this line
  ascent: number                     // Maximum ascent across all fragments
  descent: number                    // Maximum descent across all fragments
  height: number                     // Per-line height in pixels (tallest span's fontSize * lineHeight multiplier)
  y: number                          // Y offset from the top of the text block
  baseline: number                   // Y offset of the baseline from the top of the text block
}
```

> **v2.0 change:** `height` is now **per-line dynamic** — each line's height is based on the tallest font size on that line, not the global max font size. A 24px title line and a 12px body line will have different heights. In v1, all lines shared the same height based on the largest font across all spans.

### RichTextLineFragment

Each fragment is a piece of a span that lands on a particular line. A single span can be split across multiple lines; each piece becomes a separate fragment.

```typescript
interface RichTextLineFragment {
  spanIndex: number          // Index into the original spans array
  text: string               // The text content of this fragment
  x: number                  // X offset from the left edge of the line
  width: number              // Width of this fragment in pixels
  font: string               // Font family name (resolved)
  size: number               // Font size in pixels
  weight: number             // Font weight (resolved, always a number)
  style: 'normal' | 'italic' // Font style (resolved)
  letterSpacing: number      // Letter spacing in pixels (resolved, always a number)
}
```

The `x` and `width` fields give you everything you need to position each fragment in a renderer. Combined with the parent line's `y` and `baseline`, you have full 2D coordinates.

---

## Comparison with `measure()`

| | `measure()` | `measureRichText()` |
|--|------------|---------------------|
| Input | Single `text` string | Array of `RichTextSpan[]` |
| Styling | One font/size/weight per call | Mixed fonts/sizes/weights in one paragraph |
| Result lines | `string[]` (plain text) | `RichTextLine[]` (positioned fragments with per-fragment styling) |
| Fragment positioning | Not provided | `x`, `width` per fragment; `y`, `baseline` per line |
| Use case | Uniform-style text blocks | Styled paragraphs, price tags, inline formatting |

`measure()` is simpler and faster when all text shares the same style. Reach for `measureRichText()` when a single paragraph mixes fonts, sizes, or weights.

---

## Text Alignment

Rich text results can be aligned using the `textric/align` utility:

```typescript
import { alignRichTextResult } from 'textric/align'

const result = m.measureRichText(spans, { maxWidth: 300 })
const centered = alignRichTextResult(result, 300, 'center')
// centered.lines[i].fragments[j].x is now shifted for center alignment
```

See [textric/align documentation](./wrap.md#textricalign--text-alignment-utilities) for full API reference.

---

## Examples

### Price tag with currency symbol

A common pattern: the currency symbol and decimal part are smaller than the main price.

```typescript
const result = m.measureRichText([
  { text: '$', font: 'Inter', size: 14, weight: 400 },
  { text: '49', font: 'Inter', size: 32, weight: 700 },
  { text: '.99', font: 'Inter', size: 14, weight: 400 },
])

// Single-line result — no maxWidth needed
// result.width → total width of "$49.99" with mixed sizing
// result.lines[0].fragments → 3 fragments, each with x/width for positioning
```

### Paragraph with inline bold

AI-generated text with bold keywords mixed into a regular paragraph, wrapped within a container.

```typescript
const result = m.measureRichText(
  [
    { text: 'Your subscription ', font: 'Inter', size: 14, weight: 400 },
    { text: 'Pro Annual', font: 'Inter', size: 14, weight: 700 },
    { text: ' has been renewed. The next billing date is ', font: 'Inter', size: 14, weight: 400 },
    { text: 'April 30, 2026', font: 'Inter', size: 14, weight: 700 },
    { text: '.', font: 'Inter', size: 14, weight: 400 },
  ],
  { maxWidth: 320, lineHeight: 1.5 },
)

// result.lineCount → number of wrapped lines
// result.truncated → false (no maxLines set)
// Each line's fragments carry font/weight so a renderer knows which style to apply
for (const line of result.lines) {
  for (const frag of line.fragments) {
    // frag.x, frag.width — horizontal position
    // line.y, line.baseline — vertical position
    // frag.font, frag.size, frag.weight — styling
    console.log(`"${frag.text}" at (${frag.x}, ${line.y}) weight=${frag.weight}`)
  }
}
```

### Rendering loop for a canvas/SVG renderer

Use `measureRichText()` to compute layout, then iterate the result to draw.

```typescript
const layout = m.measureRichText(
  [
    { text: 'Dashboard ', font: 'Inter', size: 24, weight: 700 },
    { text: '/ ', font: 'Inter', size: 24, weight: 400 },
    { text: 'Analytics', font: 'Inter', size: 24, weight: 400, style: 'italic' },
  ],
  { maxWidth: 400 },
)

// Example: generate SVG <tspan> elements from the layout
const svgLines = layout.lines.map((line) => {
  const tspans = line.fragments.map((frag) => {
    const weight = frag.weight >= 700 ? 'bold' : 'normal'
    return `<tspan x="${frag.x}" font-weight="${weight}" font-style="${frag.style}" font-size="${frag.size}">${frag.text}</tspan>`
  })
  return `<text y="${line.baseline}">${tspans.join('')}</text>`
})

console.log(svgLines.join('\n'))
// layout.width, layout.height → viewBox dimensions
```
