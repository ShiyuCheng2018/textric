# Getting Started

## Installation

```bash
npm install textric
```

## Basic Usage

```typescript
import { createMeasurer } from 'textric'

// 1. Create a measurer with fonts
const m = await createMeasurer({
  fonts: [{ family: 'Inter', path: './fonts/Inter-Regular.ttf' }]
})

// 2. Measure text
const result = m.measure('Hello World', { font: 'Inter', size: 16 })
console.log(result.width)  // 82
console.log(result.height) // 19.2
```

That's it. No Canvas, no browser, no native dependencies.

## Loading Fonts

### From local files

```typescript
const m = await createMeasurer({
  fonts: [
    { family: 'MyBrand', path: './fonts/my-brand-regular.ttf' },
    { family: 'MyBrand', path: './fonts/my-brand-bold.ttf', weight: 700 },
  ]
})
```

Supports `.ttf`, `.woff`, `.otf` formats.

### From Buffer

```typescript
import { readFileSync } from 'fs'

const m = await createMeasurer({
  fonts: [
    { family: 'MyFont', data: readFileSync('./my-font.ttf'), weight: 400 },
  ]
})
```

## Multi-line Text

Pass `maxWidth` to enable automatic line wrapping:

```typescript
const result = m.measure('This is a paragraph that will wrap.', {
  font: 'Inter',
  size: 14,
  maxWidth: 200,
  lineHeight: 1.5,
})

console.log(result.lines)      // ['This is a paragraph', 'that will wrap.']
console.log(result.lineCount)  // 2
console.log(result.height)     // 42
```

### Truncation

```typescript
const result = m.measure(veryLongText, {
  font: 'Inter',
  size: 14,
  maxWidth: 200,
  maxLines: 3,     // show at most 3 lines
})

console.log(result.truncated)       // true
console.log(result.lineCount)       // 3 (visible)
console.log(result.totalLineCount)  // 12 (total before truncation)
```

### CJK Support

CJK text (Chinese, Japanese, Korean) wraps at character boundaries, matching browser behavior:

```typescript
const result = m.measure('这是一段中文测试文本需要自动换行', {
  font: 'Noto Sans SC',
  size: 14,
  maxWidth: 200,
})
```

## Font Weight Matching

If you request a weight that isn't loaded, Textric finds the closest available weight:

```typescript
const m = await createMeasurer({
  fonts: [{ family: 'Inter', path: './fonts/Inter-Regular.ttf' }]  // only 400 loaded
})

// Requesting weight 700 — Textric falls back to the closest available weight (400)
const result = m.measure('Bold text', { font: 'Inter', size: 16, weight: 700 })
// Measurement uses the closest loaded weight; check resolvedFont to see which was used
```

For best accuracy, load the exact weights you need.

## Error Handling

```typescript
// Check if a font is available before measuring
const info = m.getFontInfo('Inter')
if (info) {
  console.log(info.weights) // [400]
}

// If a font is not loaded, measure() will throw
// Always load your fonts via createMeasurer() or loadFont() before measuring
```

## Text Alignment

Align text left, center, or right using the `textric/align` utility:

```typescript
import { createMeasurer } from 'textric'
import { alignLines } from 'textric/align'

const m = await createMeasurer({
  fonts: [{ family: 'Inter', path: './fonts/Inter-Regular.ttf' }],
})

const result = m.measure('Center this text', {
  font: 'Inter', size: 16, maxWidth: 200,
})

const offsets = alignLines(result.lineWidths, 200, 'center')
result.lines.forEach((line, i) => {
  console.log(`x=${offsets[i].toFixed(1)}: "${line}"`)
})
```

## Next Steps

- [API Reference](../api/measurer.md) — complete API documentation
- [Font Loading Guide](./loading-fonts.md) — how to load fonts from different sources
- [Performance Guide](./performance.md) — optimization tips
