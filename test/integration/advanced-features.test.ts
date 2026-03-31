import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'
import { FontNotFoundError } from '../../src/internal/errors.js'
import { wrapText } from '../../src/internal/wrap-core.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')
const mw = createMockMeasureWidth(10)

// --- SHOULD-3: Ellipsis ---

describe('ellipsis truncation', () => {
  it('should append ellipsis when text is truncated (wrapText)', () => {
    const result = wrapText('ABCDEFGHIJ', 30, mw, {
      lineHeight: 20, maxLines: 1, ellipsis: '...',
    })
    expect(result.truncated).toBe(true)
    expect(result.lines[0]!.endsWith('...')).toBe(true)
    // "..." = 30px, but we need text + "..." <= 30px. Empty + "..." = 30px.
    // So the line should be "..."
    expect(mw(result.lines[0]!)).toBeLessThanOrEqual(30)
  })

  it('should not append ellipsis when text fits', () => {
    const result = wrapText('AB', 100, mw, {
      lineHeight: 20, maxLines: 1, ellipsis: '...',
    })
    expect(result.truncated).toBe(false)
    expect(result.lines[0]).toBe('AB')
  })

  it('should work with real fonts via measure()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('This is a very long sentence that will be truncated.', {
      font: 'Inter', size: 14, maxWidth: 100, maxLines: 1, ellipsis: '...',
    })
    if ('lines' in result) {
      expect(result.truncated).toBe(true)
      expect(result.lines[0]!.endsWith('...')).toBe(true)
    }
  })

  it('should support custom ellipsis character', () => {
    const result = wrapText('ABCDEFGHIJKLMNO', 50, mw, {
      lineHeight: 20, maxLines: 1, ellipsis: '…',
    })
    expect(result.truncated).toBe(true)
    expect(result.lines[0]!.endsWith('…')).toBe(true)
  })
})

// --- SHOULD-5: fitText ---

describe('fitText()', () => {
  it('should find the largest font size that fits', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.fitText('Hello World', {
      font: 'Inter', maxWidth: 200, maxHeight: 50,
    })
    expect(result.size).toBeGreaterThan(0)
    expect(result.height).toBeLessThanOrEqual(50)
    expect(result.width).toBeLessThanOrEqual(200)
  })

  it('should respect minSize', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.fitText('A very long text that cannot possibly fit at any reasonable size', {
      font: 'Inter', maxWidth: 50, maxHeight: 20, minSize: 8,
    })
    expect(result.size).toBeGreaterThanOrEqual(8)
  })

  it('should respect maxSize', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.fitText('Hi', {
      font: 'Inter', maxWidth: 500, maxHeight: 200, maxSize: 24,
    })
    expect(result.size).toBeLessThanOrEqual(24)
  })

  it('should return complete result with lines', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.fitText('Some text to fit into a box', {
      font: 'Inter', maxWidth: 100, maxHeight: 60,
    })
    expect(result.lines).toBeInstanceOf(Array)
    expect(result.lineCount).toBeGreaterThan(0)
    expect(result.lines.length).toBe(result.lineCount)
  })
})

// measureBatchAsync and onFallback removed — core library is pure computation

// --- SHOULD-13: paragraphSpacing ---

describe('paragraphSpacing', () => {
  it('should add extra spacing between paragraphs (wrapText)', () => {
    const noSpacing = wrapText('A\nB\nC', 200, mw, { lineHeight: 20 })
    const withSpacing = wrapText('A\nB\nC', 200, mw, { lineHeight: 20, paragraphSpacing: 10 })
    // 3 lines, 2 paragraph breaks → extra 20px
    expect(withSpacing.height).toBe(noSpacing.height + 20)
  })

  it('should not add spacing for single paragraph', () => {
    const result = wrapText('Hello World', 200, mw, { lineHeight: 20, paragraphSpacing: 10 })
    expect(result.height).toBe(20) // single line, no paragraph breaks
  })

  it('should work with real fonts via measure()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const noSpacing = m.measure('Line1\nLine2', {
      font: 'Inter', size: 14, maxWidth: 500,
    })
    const withSpacing = m.measure('Line1\nLine2', {
      font: 'Inter', size: 14, maxWidth: 500, paragraphSpacing: 10,
    })
    if ('lineCount' in noSpacing && 'lineCount' in withSpacing) {
      expect(withSpacing.height).toBeCloseTo(noSpacing.height + 10, 1)
    }
  })
})

// --- SHOULD-17p1: missingGlyphs ---

describe('missingGlyphs detection', () => {
  it('should return missingGlyphs=false for supported characters', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello World', { font: 'Inter', size: 16 })
    expect(result.missingGlyphs).toBe(false)
  })

  it('should return missingGlyphs=true for CJK chars in Latin-only font', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    // Inter (Latin subset from Google Fonts) likely lacks CJK glyphs
    const result = m.measure('你好', { font: 'Inter', size: 16 })
    expect(result.missingGlyphs).toBe(true)
  })
})

// --- resolvedFont ---

describe('resolvedFont', () => {
  it('should return resolvedFont for loaded font', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.resolvedFont).toEqual({
      family: 'Inter', weight: 400, style: 'normal',
    })
  })

  it('should throw FontNotFoundError for unknown font (no cross-family fallback)', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Unknown', size: 16 }))
      .toThrow(FontNotFoundError)
  })
})
