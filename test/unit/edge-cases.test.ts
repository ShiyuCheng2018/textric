import { describe, it, expect } from 'vitest'
import { wrapText } from '../../src/internal/wrap-core.js'
import { wrapRichText } from '../../src/internal/rich-wrap-core.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'
import type { SpanStyle, MeasureSpanWidthFn, GetSpanMetricsFn } from '../../src/types.js'

const mw = createMockMeasureWidth(10)
const spanMw: MeasureSpanWidthFn = (text, _style) => text.length * 10
const gm: GetSpanMetricsFn = (style) => ({
  ascent: style.size * 0.8,
  descent: style.size * 0.2,
})
const styleA: SpanStyle = { font: 'Inter', size: 14, weight: 400, style: 'normal', letterSpacing: 0 }

describe('wrapText edge cases', () => {
  it('should handle pure whitespace text', () => {
    const result = wrapText('   ', 100, mw, { lineHeight: 20 })
    expect(result.lineCount).toBe(1)
    expect(result.height).toBe(20)
  })

  it('should handle pure newlines', () => {
    const result = wrapText('\n\n\n', 100, mw, { lineHeight: 20 })
    expect(result.lineCount).toBe(4) // 3 newlines = 4 lines
    expect(result.height).toBe(80)
  })

  it('should handle maxWidth=1 (extremely narrow)', () => {
    const result = wrapText('AB', 1, mw, { lineHeight: 20 })
    // Each char is 10px > maxWidth=1, charBreak guarantees at least 1 char per line
    expect(result.lines).toEqual(['A', 'B'])
    expect(result.lineCount).toBe(2)
  })

  it('should handle very long text (1000+ chars)', () => {
    const longText = 'a '.repeat(500) // 500 words of "a ", each "a " = 20px
    const result = wrapText(longText, 100, mw, { lineHeight: 20 })
    // maxWidth=100, "a " = 20px, 5 per line → 500/5 = 100 lines
    expect(result.lineCount).toBe(100)
    expect(result.height).toBe(100 * 20)
  })

  it('should handle tab characters as wrappable whitespace', () => {
    const result = wrapText('Hello\tWorld', 200, mw, { lineHeight: 20 })
    expect(result.lineCount).toBe(1)
  })

  it('should handle single newline only', () => {
    const result = wrapText('\n', 100, mw, { lineHeight: 20 })
    expect(result.lineCount).toBe(2)
    expect(result.lines).toEqual(['', ''])
  })

  it('should handle maxLines=0', () => {
    const result = wrapText('Hello', 100, mw, { lineHeight: 20, maxLines: 0 })
    expect(result.lineCount).toBe(0)
    expect(result.truncated).toBe(true)
    expect(result.lines).toEqual([])
  })

  it('should handle emoji characters with correct width', () => {
    const result = wrapText('Hello 👋 World', 200, mw, { lineHeight: 20 })
    expect(result.lineCount).toBe(1)
    // Mock uses text.length (code units): 👋 = 2 code units, total = 14 * 10 = 140px
    expect(result.maxLineWidth).toBe('Hello 👋 World'.length * 10)
    expect(result.lines[0]).toBe('Hello 👋 World')
  })

  it('should handle Unicode BOM as a character', () => {
    const result = wrapText('\uFEFFHello', 200, mw, { lineHeight: 20 })
    expect(result.lineCount).toBe(1)
    expect(result.lines[0]).toBe('\uFEFFHello')
    expect(result.maxLineWidth).toBe([...'\uFEFFHello'].length * 10)
  })
})

describe('wrapRichText edge cases', () => {
  it('should handle all-empty spans', () => {
    const result = wrapRichText(
      [{ text: '', style: styleA }, { text: '', style: styleA }],
      100, spanMw, gm, { lineHeightPx: 20 },
    )
    expect(result.lineCount).toBe(0)
    expect(result.lines).toEqual([])
  })

  it('should handle span with only spaces', () => {
    const result = wrapRichText(
      [{ text: '   ', style: styleA }],
      100, spanMw, gm, { lineHeightPx: 20 },
    )
    // Spaces are a single space segment, after trim → empty fragments, but still 1 line
    expect(result.lineCount).toBe(1)
    expect(result.height).toBe(20)
  })

  it('should handle many spans (100+) with all text accounted for', () => {
    const spans = Array.from({ length: 100 }, (_, i) => ({
      text: `w${i} `,
      style: styleA,
    }))
    const result = wrapRichText(spans, 200, spanMw, gm, { lineHeightPx: 20 })
    expect(result.lineCount).toBeGreaterThan(1)
    // Verify all fragments have text from the original spans
    for (const line of result.lines) {
      for (const frag of line.fragments) {
        expect(frag.spanIndex).toBeGreaterThanOrEqual(0)
        expect(frag.spanIndex).toBeLessThan(100)
        expect(frag.text.length).toBeGreaterThan(0)
      }
    }
  })

  it('should handle span with \\n at the very end', () => {
    const result = wrapRichText(
      [{ text: 'Hello\n', style: styleA }],
      200, spanMw, gm, { lineHeightPx: 20 },
    )
    expect(result.lineCount).toBe(2)
  })

  it('should handle maxLines=0 for rich text', () => {
    const result = wrapRichText(
      [{ text: 'Hello', style: styleA }],
      200, spanMw, gm, { lineHeightPx: 20, maxLines: 0 },
    )
    expect(result.lineCount).toBe(0)
    expect(result.truncated).toBe(true)
  })
})
