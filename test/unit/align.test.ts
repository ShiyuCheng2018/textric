import { describe, it, expect } from 'vitest'
import { alignLines, alignRichTextResult } from '../../src/align.js'
import type { RichTextResult } from '../../src/types.js'

describe('alignLines()', () => {
  it('center-aligns line widths within maxWidth', () => {
    const offsets = alignLines([80, 60, 100], 200, 'center')
    expect(offsets).toEqual([60, 70, 50])
  })

  it('right-aligns line widths within maxWidth', () => {
    const offsets = alignLines([80, 60, 100], 200, 'right')
    expect(offsets).toEqual([120, 140, 100])
  })

  it('left-aligns with zero offsets', () => {
    const offsets = alignLines([80, 60], 200, 'left')
    expect(offsets).toEqual([0, 0])
  })

  it('returns 0 offsets for lines at full width', () => {
    const offsets = alignLines([200], 200, 'center')
    expect(offsets).toEqual([0])
  })

  it('handles empty array', () => {
    expect(alignLines([], 200, 'center')).toEqual([])
  })

  it('handles negative offsets when line exceeds maxWidth', () => {
    const offsets = alignLines([250], 200, 'center')
    expect(offsets).toEqual([-25])
  })
})

describe('alignRichTextResult()', () => {
  const mockResult: RichTextResult = {
    width: 80,
    height: 40,
    lineCount: 2,
    totalLineCount: 2,
    truncated: false,
    lines: [
      {
        fragments: [
          { spanIndex: 0, text: 'Hello', x: 0, width: 50, font: 'Inter', size: 16, weight: 400, style: 'normal' as const, letterSpacing: 0 },
          { spanIndex: 1, text: ' World', x: 50, width: 30, font: 'Inter', size: 16, weight: 700, style: 'normal' as const, letterSpacing: 0 },
        ],
        width: 80,
        ascent: 12, descent: 4, height: 20, y: 0, baseline: 12,
      },
      {
        fragments: [
          { spanIndex: 2, text: 'Foo', x: 0, width: 40, font: 'Inter', size: 16, weight: 400, style: 'normal' as const, letterSpacing: 0 },
        ],
        width: 40,
        ascent: 12, descent: 4, height: 20, y: 20, baseline: 32,
      },
    ],
  }

  it('center-aligns fragments within maxWidth', () => {
    const aligned = alignRichTextResult(mockResult, 200, 'center')
    expect(aligned.lines[0]!.fragments[0]!.x).toBe(60)
    expect(aligned.lines[0]!.fragments[1]!.x).toBe(110)
    expect(aligned.lines[1]!.fragments[0]!.x).toBe(80)
  })

  it('right-aligns fragments within maxWidth', () => {
    const aligned = alignRichTextResult(mockResult, 200, 'right')
    expect(aligned.lines[0]!.fragments[0]!.x).toBe(120)
    expect(aligned.lines[0]!.fragments[1]!.x).toBe(170)
    expect(aligned.lines[1]!.fragments[0]!.x).toBe(160)
  })

  it('left-align returns original result unchanged', () => {
    const aligned = alignRichTextResult(mockResult, 200, 'left')
    expect(aligned).toBe(mockResult)
  })

  it('does not mutate original result', () => {
    const aligned = alignRichTextResult(mockResult, 200, 'center')
    expect(mockResult.lines[0]!.fragments[0]!.x).toBe(0)
    expect(aligned.lines[0]!.fragments[0]!.x).toBe(60)
  })

  it('handles empty lines array', () => {
    const empty: RichTextResult = {
      width: 0, height: 0, lineCount: 0, totalLineCount: 0, truncated: false, lines: [],
    }
    const aligned = alignRichTextResult(empty, 200, 'center')
    expect(aligned.lines).toEqual([])
  })
})
