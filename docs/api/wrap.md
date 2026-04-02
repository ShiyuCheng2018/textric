# API Reference: wrapText (Low-level)

The wrapping algorithm is exported separately for advanced use cases where you want to bring your own measurement function.

## `wrapText(text, maxWidth, measureWidth, options)`

Pure function. No I/O, no side effects, no font loading. You provide the measurement callback.

```typescript
import { wrapText, type MeasureWidthFn } from 'textric/wrap'

// Provide your own measurement function
const measureWidth: MeasureWidthFn = (text: string) => {
  // return pixel width of the given text string
  return text.length * 8 // crude example
}

const result = wrapText('Hello World, this is a long text', 100, measureWidth, {
  lineHeight: 20,
  letterSpacing: 0,
  maxLines: 3,
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | Text to wrap (may contain `\n`) |
| `maxWidth` | `number` | Maximum line width in pixels |
| `measureWidth` | `MeasureWidthFn` | `(text: string) => number` — returns pixel width |
| `options` | `WrapOptions` | Line height, letter spacing, truncation |

### WrapOptions

```typescript
interface WrapOptions {
  lineHeight: number          // Line height in PIXELS, not a multiplier (required)
  letterSpacing?: number      // Extra spacing between characters (default: 0)
  maxLines?: number           // Truncate after this many lines
  maxHeight?: number          // Truncate when exceeding this height
  paragraphSpacing?: number   // Extra spacing between paragraphs on \n (default: 0)
  ellipsis?: string           // Ellipsis string to append when truncated (e.g. '...' or '…')
  indent?: number             // First-line indent in pixels (default: 0)
  hangingIndent?: number      // Hanging indent for subsequent lines in pixels (default: 0)
}
```

> **Note:** `lineHeight` here is in **pixels** (e.g., `20` for 20px line height). This differs from the high-level `measure()` API, which takes lineHeight as a **multiplier** (e.g., `1.5`). If using both APIs, convert with: `lineHeightPx = fontSize * lineHeightMultiplier`.

### WrapResult

```typescript
interface WrapResult {
  lines: string[]          // Visible (possibly truncated) wrapped lines
  lineCount: number        // Number of visible lines
  totalLineCount: number   // Total lines before truncation
  truncated: boolean       // Whether output was truncated
  height: number           // Total height of visible lines
  maxLineWidth: number     // Width of the widest visible line
}
```

## Wrapping Algorithm

1. Split text by explicit `\n` newlines
2. For each paragraph, wrap at:
   - **Latin text**: word (space) boundaries when possible
   - **CJK text** (Chinese, Japanese, Korean): character boundaries
   - **Long words**: character-by-character when a single word exceeds `maxWidth`
3. Apply truncation (`maxLines` / `maxHeight`)
4. Return visible lines + metrics

---

## `wrapRichText(spans, maxWidth, measureWidth, getMetrics, options)`

Pure function for rich text wrapping. Same philosophy as `wrapText` — you bring your own measurement functions.

```typescript
import { wrapRichText } from 'textric/wrap'
import type { MeasureSpanWidthFn, GetSpanMetricsFn } from 'textric/wrap'

const measureSpanWidth: MeasureSpanWidthFn = (text, style) => {
  return text.length * style.size * 0.5 // crude example
}

const getMetrics: GetSpanMetricsFn = (style) => ({
  ascent: style.size * 0.8,
  descent: style.size * 0.2,
})

const result = wrapRichText(
  [
    { text: 'Title\n', style: { font: 'Inter', size: 24, weight: 700, style: 'normal', letterSpacing: 0 } },
    { text: 'Body text', style: { font: 'Inter', size: 12, weight: 400, style: 'normal', letterSpacing: 0 } },
  ],
  300,
  measureSpanWidth,
  getMetrics,
  { lineHeightPx: 28.8, lineHeightMultiplier: 1.2 },
)
```

### WrapRichTextOptions

```typescript
interface WrapRichTextOptions {
  lineHeightPx: number            // Line height in PIXELS (fallback for empty lines when multiplier is set)
  lineHeightMultiplier?: number   // Per-line dynamic height: each line's height = tallestFontSize * this
  maxLines?: number               // Truncate after this many lines
  maxHeight?: number              // Truncate when accumulated height exceeds this
}
```

> **`lineHeightPx` vs `lineHeightMultiplier`:**
> - **Without `lineHeightMultiplier`**: all lines use `lineHeightPx` as uniform height (v1 behavior).
> - **With `lineHeightMultiplier`**: each line's height = `maxFontSizeOnThatLine * lineHeightMultiplier`. Empty lines (from `\n`) fall back to `lineHeightPx`.
> - **Tip**: set `lineHeightPx` to `defaultFontSize * lineHeightMultiplier` for consistent empty-line sizing.

> **Note:** The high-level `measureRichText()` always passes `lineHeightMultiplier` automatically. You only need to manage these options when using the low-level `wrapRichText()` directly.

---

## Why export this separately?

- **Testing**: test wrapping logic without loading real fonts
- **Custom renderers**: use with your own measurement engine (e.g., HarfBuzz WASM)
- **Browser use**: pair with Canvas `measureText()` for client-side wrapping
- **Isomorphic**: the same function runs in Node.js and browser
