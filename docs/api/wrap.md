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

## Why export this separately?

- **Testing**: test wrapping logic without loading real fonts
- **Custom renderers**: use with your own measurement engine (e.g., HarfBuzz WASM)
- **Browser use**: pair with Canvas `measureText()` for client-side wrapping
- **Isomorphic**: the same function runs in Node.js and browser
