import { describe, it, expect } from 'vitest'
import { wrapText } from '../../src/internal/wrap-core.js'
import { segmentize } from '../../src/internal/segment.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'
import type { SpanStyle } from '../../src/types.js'

const mw = createMockMeasureWidth(10)
const styleA: SpanStyle = { font: 'Inter', size: 14, weight: 400, style: 'normal', letterSpacing: 0 }

describe('wrapText — \\r\\n normalization', () => {
  it('should treat \\r\\n as a single line break', () => {
    const result = wrapText('Line1\r\nLine2', 200, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['Line1', 'Line2'])
    expect(result.lineCount).toBe(2)
  })

  it('should treat bare \\r as a line break', () => {
    const result = wrapText('Line1\rLine2', 200, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['Line1', 'Line2'])
    expect(result.lineCount).toBe(2)
  })

  it('should handle \\r\\n in the middle of wrapped text', () => {
    const result = wrapText('ABCDEF\r\nGHI', 30, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['ABC', 'DEF', 'GHI'])
    expect(result.lineCount).toBe(3)
  })

  it('should handle consecutive \\r\\n', () => {
    const result = wrapText('A\r\n\r\nB', 200, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['A', '', 'B'])
    expect(result.lineCount).toBe(3)
  })
})

describe('wrapText — tab handling', () => {
  it('should treat \\t as a wrappable whitespace', () => {
    const result = wrapText('Hello\tWorld', 60, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['Hello', 'World'])
    expect(result.lineCount).toBe(2)
  })

  it('should not start a new line with a tab', () => {
    const result = wrapText('AB\tCDEF', 30, mw, { lineHeight: 20 })
    expect(result.lines[0]).toBe('AB')
    expect(result.lines[1]!.startsWith('\t')).toBe(false)
  })
})

describe('wrapText — charBreak minimum progress', () => {
  it('should place at least one character per line even if char exceeds maxWidth', () => {
    const result = wrapText('ABC', 5, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['A', 'B', 'C'])
    expect(result.lineCount).toBe(3)
  })
})

describe('segmentize — \\r\\n normalization', () => {
  it('should normalize \\r\\n to newline segment', () => {
    const segments = segmentize([{ text: 'A\r\nB', style: styleA }])
    const kinds = segments.map(s => s.kind)
    expect(kinds).toEqual(['text', 'newline', 'text'])
    expect(segments[0]!.text).toBe('A')
    expect(segments[2]!.text).toBe('B')
  })

  it('should normalize bare \\r to newline segment', () => {
    const segments = segmentize([{ text: 'A\rB', style: styleA }])
    const kinds = segments.map(s => s.kind)
    expect(kinds).toEqual(['text', 'newline', 'text'])
  })

  it('should treat \\t as space segment', () => {
    const segments = segmentize([{ text: 'A\tB', style: styleA }])
    expect(segments).toEqual([
      { text: 'A', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '\t', spanIndex: 0, style: styleA, kind: 'space' },
      { text: 'B', spanIndex: 0, style: styleA, kind: 'text' },
    ])
  })
})
