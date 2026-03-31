import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import opentype from 'opentype.js'
import {
  singleLineMeasure,
  createMeasureWidthFn,
  getFontMetrics,
} from '../../src/internal/measure.js'

const FONT_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')

// Load fonts once for all tests
let font: opentype.Font
let boldFont: opentype.Font

// Use beforeAll-like pattern: load fonts synchronously
font = opentype.loadSync(FONT_PATH)
boldFont = opentype.loadSync(BOLD_PATH)

describe('singleLineMeasure', () => {
  it('should return positive width for text', () => {
    const result = singleLineMeasure(font, 'Hello', 16)
    expect(result.width).toBeGreaterThan(0)
  })

  it('should return zero width for empty string', () => {
    const result = singleLineMeasure(font, '', 16)
    expect(result.width).toBe(0)
  })

  it('should return height based on fontSize and lineHeight', () => {
    const result = singleLineMeasure(font, 'Hello', 16, { lineHeight: 1.5 })
    expect(result.height).toBeCloseTo(16 * 1.5)
  })

  it('should default lineHeight to 1.2', () => {
    const result = singleLineMeasure(font, 'Hello', 16)
    expect(result.height).toBeCloseTo(16 * 1.2)
  })

  it('should scale width proportionally with fontSize', () => {
    const w16 = singleLineMeasure(font, 'Hello', 16).width
    const w32 = singleLineMeasure(font, 'Hello', 32).width
    expect(w32).toBeCloseTo(w16 * 2, 5)
  })

  it('should increase width with letterSpacing', () => {
    const base = singleLineMeasure(font, 'Hello', 16)
    const spaced = singleLineMeasure(font, 'Hello', 16, { letterSpacing: 2 })
    // 'Hello' has 5 chars, letterSpacing adds 2px * (5-1) = 8px
    expect(spaced.width).toBeCloseTo(base.width + 8)
  })

  it('should return deterministic results', () => {
    const a = singleLineMeasure(font, 'Test string 123', 16)
    const b = singleLineMeasure(font, 'Test string 123', 16)
    expect(a.width).toBe(b.width)
    expect(a.height).toBe(b.height)
  })

  it('should produce different widths for regular vs bold', () => {
    const regular = singleLineMeasure(font, 'Hello World', 16)
    const bold = singleLineMeasure(boldFont, 'Hello World', 16)
    expect(regular.width).not.toBe(bold.width)
  })
})

describe('createMeasureWidthFn', () => {
  it('should return a function that measures text width', () => {
    const measureWidth = createMeasureWidthFn(font, 16)
    const width = measureWidth('Hello')
    expect(width).toBeGreaterThan(0)
    // Should match singleLineMeasure width
    const expected = singleLineMeasure(font, 'Hello', 16).width
    expect(width).toBeCloseTo(expected)
  })

  it('should include letterSpacing when provided', () => {
    const measureWidth = createMeasureWidthFn(font, 16, 2)
    const width = measureWidth('Hello')
    const base = font.getAdvanceWidth('Hello', 16)
    // 5 chars, 4 gaps * 2px = 8px
    expect(width).toBeCloseTo(base + 8)
  })
})

describe('getFontMetrics', () => {
  it('should return positive ascent and descent', () => {
    const metrics = getFontMetrics(font, 16)
    expect(metrics.ascent).toBeGreaterThan(0)
    expect(metrics.descent).toBeGreaterThan(0)
  })

  it('should scale with fontSize', () => {
    const m16 = getFontMetrics(font, 16)
    const m32 = getFontMetrics(font, 32)
    expect(m32.ascent).toBeCloseTo(m16.ascent * 2, 5)
    expect(m32.descent).toBeCloseTo(m16.descent * 2, 5)
  })

  it('should compute ascent/descent from font tables', () => {
    const metrics = getFontMetrics(font, 16)
    // Inter: ascender=1984, descender=-494, unitsPerEm=2048
    const expectedAscent = (1984 / 2048) * 16
    const expectedDescent = (494 / 2048) * 16
    expect(metrics.ascent).toBeCloseTo(expectedAscent)
    expect(metrics.descent).toBeCloseTo(expectedDescent)
  })
})
