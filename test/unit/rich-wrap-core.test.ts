import { describe, it, expect } from 'vitest'
import { wrapRichText } from '../../src/internal/rich-wrap-core.js'
import { createMockSpanMeasureWidth, createMockGetMetrics } from '../helpers/mock-measure-width.js'
import type { SpanStyle, WrapRichTextSpan, MeasureSpanWidthFn, GetSpanMetricsFn } from '../../src/types.js'

const styleA: SpanStyle = { font: 'Inter', size: 14, weight: 400, style: 'normal', letterSpacing: 0 }
const styleB: SpanStyle = { font: 'Inter', size: 14, weight: 700, style: 'normal', letterSpacing: 0 }
const styleLarge: SpanStyle = { font: 'Inter', size: 24, weight: 700, style: 'normal', letterSpacing: 0 }

// Simple mock: each char = 10px regardless of style
const mw: MeasureSpanWidthFn = (text: string, _style: SpanStyle) => text.length * 10
const gm: GetSpanMetricsFn = (style: SpanStyle) => ({
  ascent: style.size * 0.8,
  descent: style.size * 0.2,
})

describe('wrapRichText', () => {
  describe('empty input', () => {
    it('should return empty result for empty spans array', () => {
      const result = wrapRichText([], 100, mw, gm, { lineHeightPx: 20 })
      expect(result.lines).toEqual([])
      expect(result.lineCount).toBe(0)
      expect(result.totalLineCount).toBe(0)
      expect(result.truncated).toBe(false)
      expect(result.height).toBe(0)
      expect(result.maxLineWidth).toBe(0)
    })
  })

  describe('single span (degenerate case)', () => {
    it('should wrap single span identically to plain text', () => {
      const spans: WrapRichTextSpan[] = [{ text: 'Hello World', style: styleA }]
      const result = wrapRichText(spans, 60, mw, gm, { lineHeightPx: 20 })
      expect(result.lineCount).toBe(2)
      expect(result.lines[0]!.fragments).toHaveLength(1)
      expect(result.lines[0]!.fragments[0]!.text).toBe('Hello')
      expect(result.lines[1]!.fragments[0]!.text).toBe('World')
    })

    it('should not wrap when text fits', () => {
      const spans: WrapRichTextSpan[] = [{ text: 'Hello', style: styleA }]
      const result = wrapRichText(spans, 100, mw, gm, { lineHeightPx: 20 })
      expect(result.lineCount).toBe(1)
      expect(result.lines[0]!.fragments[0]!.text).toBe('Hello')
      expect(result.lines[0]!.width).toBe(50)
    })
  })

  describe('multi-span same line', () => {
    it('should place multiple spans on one line when they fit', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'Hello ', style: styleA },
        { text: 'World', style: styleB },
      ]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lineCount).toBe(1)
      expect(result.lines[0]!.fragments).toHaveLength(2)
      expect(result.lines[0]!.fragments[0]!.text).toBe('Hello ')
      expect(result.lines[0]!.fragments[0]!.spanIndex).toBe(0)
      expect(result.lines[0]!.fragments[1]!.text).toBe('World')
      expect(result.lines[0]!.fragments[1]!.spanIndex).toBe(1)
    })

    it('should compute correct x offsets for fragments', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'AB', style: styleA },
        { text: 'CD', style: styleB },
      ]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lines[0]!.fragments[0]!.x).toBe(0)
      expect(result.lines[0]!.fragments[0]!.width).toBe(20)
      expect(result.lines[0]!.fragments[1]!.x).toBe(20)
      expect(result.lines[0]!.fragments[1]!.width).toBe(20)
    })
  })

  describe('cross-span word preservation', () => {
    it('should not break a word split across spans', () => {
      // "wor" + "ld test" — "world" should stay together
      const spans: WrapRichTextSpan[] = [
        { text: 'This is a wor', style: styleA },
        { text: 'ld of text', style: styleB },
      ]
      // maxWidth = 100 (10 chars)
      // "This is a " = 100px fits with "wor" = 130px doesn't fit
      // Need to wrap "world" together
      const result = wrapRichText(spans, 100, mw, gm, { lineHeightPx: 20 })
      // Verify "wor" and "ld" end up on the same line
      const worldLine = result.lines.find(l =>
        l.fragments.some(f => f.text.includes('wor')) ||
        l.fragments.some(f => f.text.includes('ld'))
      )
      expect(worldLine).toBeDefined()
      const worFrag = worldLine!.fragments.find(f => f.text.includes('wor'))
      const ldFrag = worldLine!.fragments.find(f => f.text.startsWith('ld'))
      // Both should be on the same line
      expect(worFrag).toBeDefined()
      expect(ldFrag).toBeDefined()
    })
  })

  describe('CJK wrapping in rich text', () => {
    it('should break CJK at character boundaries across spans', () => {
      const spans: WrapRichTextSpan[] = [
        { text: '你好', style: styleA },
        { text: '世界测试', style: styleB },
      ]
      // maxWidth=30 (3 chars)
      const result = wrapRichText(spans, 30, mw, gm, { lineHeightPx: 20 })
      expect(result.lineCount).toBe(2)
    })
  })

  describe('newlines', () => {
    it('should handle \\n within a span', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'Line1\nLine2', style: styleA },
      ]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lineCount).toBe(2)
      expect(result.lines[0]!.fragments[0]!.text).toBe('Line1')
      expect(result.lines[1]!.fragments[0]!.text).toBe('Line2')
    })

    it('should handle \\n at span boundary', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'Hello\n', style: styleA },
        { text: 'World', style: styleB },
      ]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lineCount).toBe(2)
      expect(result.lines[0]!.fragments[0]!.text).toBe('Hello')
      expect(result.lines[1]!.fragments[0]!.text).toBe('World')
    })
  })

  describe('fragment merging', () => {
    it('should merge adjacent fragments from the same span', () => {
      // "Hello World" as one span — segments split into ["Hello", " ", "World"]
      // but on the same line they should merge back
      const spans: WrapRichTextSpan[] = [{ text: 'Hello World', style: styleA }]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      // Should be merged into one fragment
      expect(result.lines[0]!.fragments).toHaveLength(1)
      expect(result.lines[0]!.fragments[0]!.text).toBe('Hello World')
    })
  })

  describe('truncation', () => {
    it('should truncate with maxLines', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'A\nB\nC\nD\nE', style: styleA },
      ]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20, maxLines: 2 })
      expect(result.lineCount).toBe(2)
      expect(result.totalLineCount).toBe(5)
      expect(result.truncated).toBe(true)
    })

    it('should truncate with maxHeight', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'A\nB\nC\nD', style: styleA },
      ]
      // lineHeight=20, maxHeight=40 → 2 lines
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20, maxHeight: 40 })
      expect(result.lineCount).toBe(2)
      expect(result.truncated).toBe(true)
    })
  })

  describe('baseline and line height', () => {
    it('should compute line height from lineHeight parameter', () => {
      const spans: WrapRichTextSpan[] = [{ text: 'Hello', style: styleA }]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lines[0]!.height).toBe(20)
      expect(result.height).toBe(20)
    })

    it('should compute correct ascent/descent from metrics', () => {
      const spans: WrapRichTextSpan[] = [{ text: 'Hello', style: styleA }]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      // styleA.size=14, ascent=14*0.8=11.2, descent=14*0.2=2.8
      expect(result.lines[0]!.ascent).toBeCloseTo(11.2)
      expect(result.lines[0]!.descent).toBeCloseTo(2.8)
    })

    it('should use max ascent/descent when spans have different sizes', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'Small ', style: styleA },      // size 14: ascent=11.2, descent=2.8
        { text: 'Big', style: styleLarge },      // size 24: ascent=19.2, descent=4.8
      ]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 30 })
      expect(result.lines[0]!.ascent).toBeCloseTo(19.2)  // max ascent
      expect(result.lines[0]!.descent).toBeCloseTo(4.8)   // max descent
    })

    it('should compute y positions for multiple lines', () => {
      const spans: WrapRichTextSpan[] = [{ text: 'A\nB\nC', style: styleA }]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lines[0]!.y).toBe(0)
      expect(result.lines[1]!.y).toBe(20)
      expect(result.lines[2]!.y).toBe(40)
    })

    it('should set baseline = y + ascent', () => {
      const spans: WrapRichTextSpan[] = [{ text: 'A\nB', style: styleA }]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lines[0]!.baseline).toBeCloseTo(result.lines[0]!.y + result.lines[0]!.ascent)
      expect(result.lines[1]!.baseline).toBeCloseTo(result.lines[1]!.y + result.lines[1]!.ascent)
    })
  })

  describe('trailing space trimming', () => {
    it('should trim trailing spaces from line width', () => {
      const spans: WrapRichTextSpan[] = [
        { text: 'Hello ', style: styleA },
        { text: 'World', style: styleB },
      ]
      // "Hello " wraps → "Hello" on line 1 (trailing space trimmed)
      const result = wrapRichText(spans, 55, mw, gm, { lineHeightPx: 20 })
      // Line 1 should be "Hello" not "Hello "
      const line1Text = result.lines[0]!.fragments.map(f => f.text).join('')
      expect(line1Text.endsWith(' ')).toBe(false)
    })
  })

  describe('empty spans', () => {
    it('should handle span with empty text', () => {
      const spans: WrapRichTextSpan[] = [
        { text: '', style: styleA },
        { text: 'Hello', style: styleB },
      ]
      const result = wrapRichText(spans, 200, mw, gm, { lineHeightPx: 20 })
      expect(result.lineCount).toBe(1)
      expect(result.lines[0]!.fragments[0]!.text).toBe('Hello')
      expect(result.lines[0]!.fragments[0]!.spanIndex).toBe(1)
    })
  })
})

describe('per-line dynamic line height', () => {
  const mw2: MeasureSpanWidthFn = (text: string, _style: SpanStyle) => text.length * 10
  const gm2: GetSpanMetricsFn = (style: SpanStyle) => ({
    ascent: style.size * 0.8,
    descent: style.size * 0.2,
  })

  const bigStyle: SpanStyle = { font: 'Inter', size: 24, weight: 700, style: 'normal', letterSpacing: 0 }
  const smallStyle: SpanStyle = { font: 'Inter', size: 12, weight: 400, style: 'normal', letterSpacing: 0 }

  it('lines with different font sizes get different heights', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Title\n', style: bigStyle },
      { text: 'body text', style: smallStyle },
    ]
    const result = wrapRichText(spans, 100, mw2, gm2, {
      lineHeightPx: 28.8,
      lineHeightMultiplier: 1.2,
    })

    expect(result.lines[0]!.height).toBeCloseTo(28.8)
    expect(result.lines[1]!.height).toBeCloseTo(14.4)
    expect(result.height).toBeCloseTo(43.2)
  })

  it('y positions accumulate per-line heights', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Big\n', style: bigStyle },
      { text: 'Small\n', style: smallStyle },
      { text: 'Big', style: bigStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 28.8,
      lineHeightMultiplier: 1.2,
    })

    expect(result.lines[0]!.y).toBeCloseTo(0)
    expect(result.lines[1]!.y).toBeCloseTo(28.8)
    expect(result.lines[2]!.y).toBeCloseTo(28.8 + 14.4)
  })

  it('single line with mixed sizes uses max font size', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Big', style: bigStyle },
      { text: 'Small', style: smallStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 28.8,
      lineHeightMultiplier: 1.2,
    })

    expect(result.lineCount).toBe(1)
    expect(result.lines[0]!.height).toBeCloseTo(28.8)
  })

  it('uniform font sizes produce same result as without multiplier', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Hello World Test', style: smallStyle },
    ]

    const withMultiplier = wrapRichText(spans, 80, mw2, gm2, {
      lineHeightPx: 14.4,
      lineHeightMultiplier: 1.2,
    })

    const without = wrapRichText(spans, 80, mw2, gm2, {
      lineHeightPx: 14.4,
    })

    expect(withMultiplier.height).toBeCloseTo(without.height)
    expect(withMultiplier.lineCount).toBe(without.lineCount)
  })

  it('maxHeight truncation works with varying line heights', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Title\n', style: bigStyle },
      { text: 'body', style: smallStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 28.8,
      lineHeightMultiplier: 1.2,
      maxHeight: 35,
    })

    expect(result.lineCount).toBe(1)
    expect(result.truncated).toBe(true)
    expect(result.height).toBeCloseTo(28.8)
  })

  it('maxHeight smaller than first line returns 0 lines', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Title\nbody', style: bigStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 28.8,
      lineHeightMultiplier: 1.2,
      maxHeight: 10,
    })

    expect(result.lineCount).toBe(0)
    expect(result.truncated).toBe(true)
    expect(result.height).toBe(0)
  })

  it('maxLines with lineHeightMultiplier limits to exact count', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Big\n', style: bigStyle },
      { text: 'Small\n', style: smallStyle },
      { text: 'More', style: smallStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 28.8,
      lineHeightMultiplier: 1.2,
      maxLines: 2,
    })

    expect(result.lineCount).toBe(2)
    expect(result.truncated).toBe(true)
    expect(result.height).toBeCloseTo(43.2)
  })

  it('maxLines + maxHeight: stricter constraint wins', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Big\n', style: bigStyle },
      { text: 'Small\n', style: smallStyle },
      { text: 'More', style: smallStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 28.8,
      lineHeightMultiplier: 1.2,
      maxLines: 3,
      maxHeight: 35,
    })

    expect(result.lineCount).toBe(1)
    expect(result.truncated).toBe(true)
  })

  it('empty lines from newlines use fallback lineHeightPx', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'A\n\nB', style: smallStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 14.4,
      lineHeightMultiplier: 1.2,
    })

    expect(result.lines[1]!.height).toBeCloseTo(14.4)
    expect(result.height).toBeCloseTo(43.2)
  })

  it('without lineHeightMultiplier, all lines use uniform lineHeightPx', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Title\n', style: bigStyle },
      { text: 'body', style: smallStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 28.8,
    })

    expect(result.lines[0]!.height).toBeCloseTo(28.8)
    expect(result.lines[1]!.height).toBeCloseTo(28.8)
    expect(result.height).toBeCloseTo(57.6)
  })

  it('lineHeightMultiplier: 0 produces 0-height lines (not fallback)', () => {
    const spans: WrapRichTextSpan[] = [
      { text: 'Hello', style: smallStyle },
    ]
    const result = wrapRichText(spans, 200, mw2, gm2, {
      lineHeightPx: 14.4,
      lineHeightMultiplier: 0,
    })

    // multiplier=0 → height=12*0=0, not fallback to 14.4
    expect(result.lines[0]!.height).toBe(0)
    expect(result.height).toBe(0)
  })
})
