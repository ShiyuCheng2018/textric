import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { wrapText } from '../../src/internal/wrap-core.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'
import { createMeasurer } from '../../src/internal/measurer.js'

const mw = createMockMeasureWidth(10)
const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')

// --- Ellipsis edge cases ---

describe('ellipsis — edge cases', () => {
  it('should not append ellipsis to empty text', () => {
    const result = wrapText('', 30, mw, { lineHeight: 20, maxLines: 1, ellipsis: '...' })
    expect(result.truncated).toBe(false)
    expect(result.lines[0]).toBe('')
  })

  it('should skip ellipsis when ellipsis itself exceeds maxWidth', () => {
    // "..." = 30px, maxWidth = 20px → ellipsis wider than container
    const result = wrapText('ABCDEF', 20, mw, { lineHeight: 20, maxLines: 1, ellipsis: '...' })
    expect(result.truncated).toBe(true)
    expect(result.lines.length).toBe(1)
    // Should NOT append ellipsis, keep original truncated text
    expect(result.lines[0]!.endsWith('...')).toBe(false)
  })

  it('should handle single-character text with ellipsis and truncation', () => {
    // "ABCDEF" maxWidth=15 maxLines=1 ellipsis="."
    // "." = 10px, available = 5px, no char fits in 5px → line = "."
    const result = wrapText('ABCDEF', 15, mw, { lineHeight: 20, maxLines: 1, ellipsis: '.' })
    expect(result.truncated).toBe(true)
    expect(result.lines[0]).toBe('.')
  })
})

// --- fitText edge cases ---

describe('fitText — edge cases', () => {
  it('should clamp when minSize > maxSize and produce valid layout', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.fitText('Hello World', {
      font: 'Inter', maxWidth: 200, maxHeight: 50,
      minSize: 48, maxSize: 12, // inverted — lib swaps them internally
    })
    // Effective range is 12-48. Result must fit constraints.
    expect(result.size).toBeLessThanOrEqual(48)
    expect(result.size).toBeGreaterThanOrEqual(12)
    expect(result.height).toBeLessThanOrEqual(50)
    expect(result.width).toBeLessThanOrEqual(200)
  })

  it('should handle empty text by returning maxSize', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.fitText('', {
      font: 'Inter', maxWidth: 200, maxHeight: 100, maxSize: 72,
    })
    // Empty text always fits → should return maxSize (or close, due to 0.5 rounding)
    expect(result.size).toBeGreaterThanOrEqual(71)
    expect(result.lineCount).toBe(1)
  })
})

// --- paragraphSpacing + maxHeight interaction ---

describe('paragraphSpacing + maxHeight', () => {
  it('should not exceed maxHeight when paragraphSpacing is large', () => {
    // 4 paragraphs, lineHeight=20, paragraphSpacing=30, maxHeight=80
    // Without paragraph spacing: 4*20=80, fits 4 lines
    // With paragraph spacing: 4*20 + 3*30 = 170, exceeds 80
    // Should reduce visible lines until height <= 80
    const result = wrapText('A\nB\nC\nD', 200, mw, {
      lineHeight: 20, maxHeight: 80, paragraphSpacing: 30,
    })
    expect(result.height).toBeLessThanOrEqual(80)
    expect(result.truncated).toBe(true)
    // Must truncate to fewer than 4 lines
    expect(result.lineCount).toBeLessThan(4)
    expect(result.lineCount).toBeGreaterThanOrEqual(1)
  })

  it('should compute correct height with truncation + paragraphSpacing', () => {
    // "A\nB\nC" maxLines=2, paragraphSpacing=10
    // 2 lines * 20 + 1 break * 10 = 50
    const result = wrapText('A\nB\nC', 200, mw, {
      lineHeight: 20, maxLines: 2, paragraphSpacing: 10,
    })
    expect(result.lineCount).toBe(2)
    expect(result.height).toBe(50)
  })
})

// --- resolvedFont accuracy ---

describe('resolvedFont — weight accuracy', () => {
  it('should report actual weight used in weight fallback', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    // Request 700, only 400 loaded → fallback to 400
    const result = m.measure('Hello', { font: 'Inter', size: 16, weight: 700 })
    expect(result.resolvedFont.weight).toBe(400) // actual weight, not requested
  })
})

// --- kinsoku: consecutive prohibited characters ---

describe('kinsoku — consecutive prohibited chars', () => {
  it('should not place consecutive closing marks at line start', () => {
    // "你好！！测试" maxWidth=30 (3 chars)
    const result = wrapText('你好！！测试', 30, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['你', '好！！', '测试'])
    // Verify no line starts with prohibited character
    for (let i = 1; i < result.lines.length; i++) {
      const first = result.lines[i]![0]!
      expect('。，、；：？！）】」』》〉'.includes(first)).toBe(false)
    }
  })
})
