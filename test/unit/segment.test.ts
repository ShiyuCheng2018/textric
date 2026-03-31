import { describe, it, expect } from 'vitest'
import { segmentize, type Segment } from '../../src/internal/segment.js'
import type { SpanStyle } from '../../src/types.js'

const styleA: SpanStyle = { font: 'Inter', size: 14, weight: 400, style: 'normal', letterSpacing: 0 }
const styleB: SpanStyle = { font: 'Inter', size: 14, weight: 700, style: 'normal', letterSpacing: 0 }

describe('segmentize', () => {
  it('should split Latin text into words and spaces', () => {
    const segments = segmentize([{ text: 'Hello World', style: styleA }])
    expect(segments).toEqual([
      { text: 'Hello', spanIndex: 0, style: styleA, kind: 'text' },
      { text: ' ', spanIndex: 0, style: styleA, kind: 'space' },
      { text: 'World', spanIndex: 0, style: styleA, kind: 'text' },
    ])
  })

  it('should split CJK text into individual characters', () => {
    const segments = segmentize([{ text: '你好世界', style: styleA }])
    expect(segments).toEqual([
      { text: '你', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '好', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '世', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '界', spanIndex: 0, style: styleA, kind: 'text' },
    ])
  })

  it('should handle mixed Latin and CJK in one span', () => {
    const segments = segmentize([{ text: 'Hi你好', style: styleA }])
    expect(segments).toEqual([
      { text: 'Hi', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '你', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '好', spanIndex: 0, style: styleA, kind: 'text' },
    ])
  })

  it('should produce newline segments for \\n', () => {
    const segments = segmentize([{ text: 'A\nB', style: styleA }])
    expect(segments).toEqual([
      { text: 'A', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '\n', spanIndex: 0, style: styleA, kind: 'newline' },
      { text: 'B', spanIndex: 0, style: styleA, kind: 'text' },
    ])
  })

  it('should handle consecutive \\n', () => {
    const segments = segmentize([{ text: 'A\n\nB', style: styleA }])
    expect(segments).toEqual([
      { text: 'A', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '\n', spanIndex: 0, style: styleA, kind: 'newline' },
      { text: '\n', spanIndex: 0, style: styleA, kind: 'newline' },
      { text: 'B', spanIndex: 0, style: styleA, kind: 'text' },
    ])
  })

  it('should handle multiple spans with different styles', () => {
    const segments = segmentize([
      { text: 'Hello ', style: styleA },
      { text: 'World', style: styleB },
    ])
    expect(segments).toEqual([
      { text: 'Hello', spanIndex: 0, style: styleA, kind: 'text' },
      { text: ' ', spanIndex: 0, style: styleA, kind: 'space' },
      { text: 'World', spanIndex: 1, style: styleB, kind: 'text' },
    ])
  })

  it('should create segment boundary at span boundary', () => {
    // "wor" and "ld" are separate text segments (different spans)
    const segments = segmentize([
      { text: 'wor', style: styleA },
      { text: 'ld test', style: styleB },
    ])
    expect(segments).toEqual([
      { text: 'wor', spanIndex: 0, style: styleA, kind: 'text' },
      { text: 'ld', spanIndex: 1, style: styleB, kind: 'text' },
      { text: ' ', spanIndex: 1, style: styleB, kind: 'space' },
      { text: 'test', spanIndex: 1, style: styleB, kind: 'text' },
    ])
  })

  it('should skip empty spans', () => {
    const segments = segmentize([
      { text: '', style: styleA },
      { text: 'Hello', style: styleB },
    ])
    expect(segments).toEqual([
      { text: 'Hello', spanIndex: 1, style: styleB, kind: 'text' },
    ])
  })

  it('should handle pure space spans', () => {
    const segments = segmentize([
      { text: 'A', style: styleA },
      { text: '  ', style: styleB },
      { text: 'B', style: styleA },
    ])
    expect(segments).toEqual([
      { text: 'A', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '  ', spanIndex: 1, style: styleB, kind: 'space' },
      { text: 'B', spanIndex: 2, style: styleA, kind: 'text' },
    ])
  })

  it('should return empty array for empty spans array', () => {
    expect(segmentize([])).toEqual([])
  })

  it('should return empty array for all-empty spans', () => {
    expect(segmentize([{ text: '', style: styleA }])).toEqual([])
  })

  it('should handle multiple consecutive spaces', () => {
    const segments = segmentize([{ text: 'A   B', style: styleA }])
    expect(segments).toEqual([
      { text: 'A', spanIndex: 0, style: styleA, kind: 'text' },
      { text: '   ', spanIndex: 0, style: styleA, kind: 'space' },
      { text: 'B', spanIndex: 0, style: styleA, kind: 'text' },
    ])
  })
})
