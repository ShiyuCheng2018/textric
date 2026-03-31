# API Reference: Measurer

## `createMeasurer(options)`

Create a measurer instance with pre-loaded fonts.

```typescript
import { createMeasurer } from 'textric'

const m = await createMeasurer({
  fonts: [
    { family: 'Inter', path: './fonts/Inter-Regular.ttf' },
    { family: 'Inter', path: './fonts/Inter-Bold.ttf', weight: 700 },
    { family: 'MyFont', path: './fonts/my-font.ttf' },
  ],
})
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts` | `FontSource[]` | `[]` | Fonts to pre-load on creation |
| `maxCachedFonts` | `number` | `100` | Maximum number of font variants to cache in memory (LRU) |

### FontSource

```typescript
// Local file
{ family: 'MyFont', path: './fonts/my-font.ttf' }

// Buffer (in-memory)
{ family: 'MyFont', data: Buffer }
```

---

## `m.measure(text, options)`

Measure a single text string. Synchronous after fonts are loaded.

```typescript
const result = m.measure('Hello World', {
  font: 'Inter',
  size: 16,
  weight: 400,
})
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `font` | `string` | **required** | Font family name |
| `size` | `number` | **required** | Font size in pixels |
| `weight` | `number` | `400` | Font weight (100-900) |
| `style` | `string` | `'normal'` | `'normal'` or `'italic'` |
| `letterSpacing` | `number` | `0` | Extra letter spacing in pixels |
| `lineHeight` | `number` | `1.2` | Line height multiplier |
| `maxWidth` | `number` | — | Enable multi-line wrapping |
| `maxLines` | `number` | — | Max visible lines (requires `maxWidth`) |
| `maxHeight` | `number` | — | Max visible height in px (requires `maxWidth`) |
| `paragraphSpacing` | `number` | `0` | Extra spacing between paragraphs (on `\n`) in pixels |
| `ellipsis` | `string` | — | Ellipsis string to append when text is truncated (e.g. `'...'` or `'…'`) |
| `indent` | `number` | `0` | First-line indent in pixels. Reduces first line's effective maxWidth |
| `hangingIndent` | `number` | `0` | Hanging indent in pixels. Reduces subsequent lines' effective maxWidth |

### MeasureResult

**Single-line** (no `maxWidth`):

```typescript
interface SingleLineMeasureResult {
  width: number              // Text width in pixels
  height: number             // fontSize * lineHeight (lineHeight is a multiplier, e.g. 1.2)
  ascent: number             // Ascent in pixels (distance from baseline to top)
  descent: number            // Descent in pixels (distance from baseline to bottom)
  resolvedFont: {            // The font actually used for measurement
    family: string
    weight: number
    style: 'normal' | 'italic'
  }
  missingGlyphs: boolean     // True if the font is missing glyphs for some characters
}
```

**Multi-line** (with `maxWidth`):

```typescript
interface MultiLineMeasureResult {
  width: number           // Width of the widest line
  height: number          // Total height of visible lines (lineCount * fontSize * lineHeight)
  lines: string[]         // Text content of each visible line
  lineWidths: number[]    // Width of each line in pixels
  lineCount: number       // Number of visible lines
  totalLineCount: number  // Total lines before truncation
  truncated: boolean      // Whether text was truncated by maxLines/maxHeight
  resolvedFont: {         // The font actually used for measurement
    family: string
    weight: number
    style: 'normal' | 'italic'
  }
  missingGlyphs: boolean  // True if the font is missing glyphs for some characters
}
```

**About `truncated`:** Set to `true` when the text would need more lines than `maxLines` or more height than `maxHeight`. Use `totalLineCount` to see how many lines the full text needs.

> **Note on `lineHeight`:** In `measure()`, lineHeight is a **multiplier** (e.g., `1.5` means `fontSize * 1.5`). This differs from the low-level `wrapText()` function in `textric/wrap`, which takes lineHeight in **pixels**. The `measure()` API handles the conversion internally.

---

## `m.measureBatch(items)`

Measure multiple texts in one call. Shares font loading across items.

```typescript
const results = m.measureBatch([
  { text: 'Button 1', font: 'Inter', size: 14 },
  { text: 'Button 2', font: 'Inter', size: 14 },
  { text: 'Title', font: 'Inter', size: 24, weight: 700 },
])
// → MeasureResult[]
```

---

## `m.shrinkWrap(text, options)`

Find the optimal (narrowest) container width that fits text within a given number of lines.

```typescript
const { width } = m.shrinkWrap('Text to fit tightly across lines', {
  font: 'Inter',
  size: 14,
  maxLines: 2,
  lineHeight: 1.5,
})
// → { width: 186 } — the narrowest width that fits in 2 lines
```

### Options

Same as `measure()`, but `maxLines` is required and `maxWidth` is ignored (it's what we're solving for).

---

## `m.fitText(text, options)`

Find the optimal font size that fits text within a given container (maxWidth x maxHeight). Uses binary search internally.

```typescript
const result = m.fitText('Hello World, this is a headline', {
  font: 'Inter',
  maxWidth: 300,
  maxHeight: 100,
  weight: 700,
  lineHeight: 1.4,
  minSize: 10,
  maxSize: 72,
})
// → { size: 28, width: 295, height: 78, lines: [...], lineCount: 2 }
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `font` | `string` | **required** | Font family name |
| `maxWidth` | `number` | **required** | Maximum container width in pixels |
| `maxHeight` | `number` | **required** | Maximum container height in pixels |
| `weight` | `number` | `400` | Font weight (100-900) |
| `style` | `string` | `'normal'` | `'normal'` or `'italic'` |
| `letterSpacing` | `number` | `0` | Extra letter spacing in pixels |
| `lineHeight` | `number` | `1.2` | Line height multiplier |
| `maxLines` | `number` | — | Max visible lines |
| `minSize` | `number` | — | Minimum font size to try |
| `maxSize` | `number` | — | Maximum font size to try |

### FitTextResult

```typescript
interface FitTextResult {
  size: number      // Optimal font size in pixels
  width: number     // Width of the widest line at optimal size
  height: number    // Total height at optimal size
  lines: string[]   // Wrapped lines at optimal size
  lineCount: number // Number of lines at optimal size
}
```

---

## `m.estimateCharCount(options)`

Estimate how many characters fit in a given width at a given font size. Useful for truncation previews or rough layout calculations without measuring actual text.

```typescript
const count = m.estimateCharCount({
  font: 'Inter',
  size: 14,
  maxWidth: 300,
  weight: 400,
})
// → 42 — approximately 42 characters fit in 300px at Inter 14px
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `font` | `string` | **required** | Font family name |
| `size` | `number` | **required** | Font size in pixels |
| `maxWidth` | `number` | **required** | Available width in pixels |
| `weight` | `number` | `400` | Font weight (100-900) |
| `style` | `string` | `'normal'` | `'normal'` or `'italic'` |

Returns a `number` — the estimated character count.

---

## `m.getFontMetrics(font, size, weight?, style?)`

Get detailed font metrics for a specific font at a given size.

```typescript
const metrics = m.getFontMetrics('Inter', 16, 400, 'normal')
// → { ascent: 14.08, descent: 3.52, unitsPerEm: 2048, underlineOffset: 1.5, underlineThickness: 1.0 }
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `font` | `string` | **required** | Font family name |
| `size` | `number` | **required** | Font size in pixels |
| `weight` | `number` | `400` | Font weight (100-900) |
| `style` | `string` | `'normal'` | `'normal'` or `'italic'` |

### FontMetricsDetailed

```typescript
interface FontMetricsDetailed {
  ascent: number              // Ascent in pixels
  descent: number             // Descent in pixels
  unitsPerEm: number          // Font design units per em
  underlineOffset: number     // Underline offset in pixels
  underlineThickness: number  // Underline thickness in pixels
}
```

Returns `null` if the font is not loaded.

---

## `m.loadFont(fontSource)`

Load an additional font at runtime.

```typescript
await m.loadFont({ family: 'Poppins', path: './fonts/Poppins-SemiBold.ttf', weight: 600 })
// Now you can measure with Poppins 600

// Also accepts Buffer
await m.loadFont({ family: 'Brand', data: fontBuffer })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `family` | `string` | **required** | Font family name |
| `weight` | `number` | `400` | Font weight |
| `style` | `string` | `'normal'` | `'normal'` or `'italic'` |
| `path` | `string` | — | Local file path (.ttf/.woff/.otf) |
| `data` | `Buffer` | — | In-memory font binary |

---

## `m.getFontInfo(family)`

Get available weights and styles for a loaded font.

```typescript
const info = m.getFontInfo('Inter')
// → { weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], styles: ['normal', 'italic'] }
```

Returns `null` if the font is unknown.
