import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import opentype from 'opentype.js'
import { singleLineMeasure, createMeasureWidthFn } from '../../src/internal/measure.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')

const font = opentype.loadSync(REGULAR_PATH)
const boldFont = opentype.loadSync(BOLD_PATH)

/**
 * Golden value precision tests.
 *
 * Since Textric uses opentype.js getAdvanceWidth() directly,
 * the results must be mathematically identical to direct opentype.js calls.
 * Tolerance: < 0.01px (floating point precision only).
 */
describe('measurement accuracy — golden values', () => {
  const TOLERANCE = 0.001 // sub-pixel precision

  describe('single-line width matches opentype.js exactly', () => {
    const testCases = [
      { text: 'Hello', size: 16 },
      { text: 'Hello World', size: 16 },
      { text: 'The quick brown fox jumps over the lazy dog', size: 14 },
      { text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', size: 12 },
      { text: 'abcdefghijklmnopqrstuvwxyz', size: 12 },
      { text: '0123456789', size: 20 },
      { text: '!@#$%^&*()_+-=[]{}|;:,.<>?', size: 16 },
      { text: 'A', size: 72 },
      { text: 'Hello World Hello World Hello World', size: 10 },
      { text: ' ', size: 16 },
    ]

    for (const { text, size } of testCases) {
      it(`"${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" at ${size}px`, () => {
        const expected = font.getAdvanceWidth(text, size)
        const result = singleLineMeasure(font, text, size)
        expect(Math.abs(result.width - expected)).toBeLessThan(TOLERANCE)
      })
    }
  })

  describe('bold font width matches opentype.js exactly', () => {
    const testCases = [
      { text: 'Hello World', size: 16 },
      { text: 'Dashboard', size: 24 },
      { text: '$12,450.00', size: 32 },
    ]

    for (const { text, size } of testCases) {
      it(`bold "${text}" at ${size}px`, () => {
        const expected = boldFont.getAdvanceWidth(text, size)
        const result = singleLineMeasure(boldFont, text, size)
        expect(Math.abs(result.width - expected)).toBeLessThan(TOLERANCE)
      })
    }
  })

  describe('letterSpacing is mathematically exact', () => {
    it('should add exactly (n-1) * letterSpacing to width', () => {
      const text = 'Hello' // 5 chars
      const size = 16
      const letterSpacing = 2.5

      const baseWidth = font.getAdvanceWidth(text, size)
      const expected = baseWidth + letterSpacing * (text.length - 1)
      const result = singleLineMeasure(font, text, size, { letterSpacing })

      expect(Math.abs(result.width - expected)).toBeLessThan(TOLERANCE)
    })
  })

  describe('createMeasureWidthFn matches singleLineMeasure', () => {
    it('should produce identical width', () => {
      const text = 'Hello World'
      const size = 16

      const measureWidth = createMeasureWidthFn(font, size)
      const fnResult = measureWidth(text)
      const measureResult = singleLineMeasure(font, text, size)

      expect(fnResult).toBe(measureResult.width)
    })

    it('should produce identical width with letterSpacing', () => {
      const text = 'Test'
      const size = 14
      const letterSpacing = 1.5

      const measureWidth = createMeasureWidthFn(font, size, letterSpacing)
      const fnResult = measureWidth(text)
      const measureResult = singleLineMeasure(font, text, size, { letterSpacing })

      expect(fnResult).toBe(measureResult.width)
    })
  })

  describe('height calculation is exact', () => {
    it('should compute height = fontSize * lineHeight exactly', () => {
      const result = singleLineMeasure(font, 'Hello', 16, { lineHeight: 1.5 })
      expect(result.height).toBe(16 * 1.5)
    })

    it('should compute height with default lineHeight', () => {
      const result = singleLineMeasure(font, 'Hello', 16)
      expect(result.height).toBe(16 * 1.2)
    })
  })

  describe('width scales linearly with fontSize', () => {
    const sizes = [8, 12, 16, 24, 32, 48, 72]
    const text = 'Scale test'

    for (const size of sizes) {
      it(`width at ${size}px should be ${size}/16 of width at 16px`, () => {
        const w16 = singleLineMeasure(font, text, 16).width
        const wN = singleLineMeasure(font, text, size).width
        const ratio = size / 16
        expect(Math.abs(wN - w16 * ratio)).toBeLessThan(TOLERANCE)
      })
    }
  })

  describe('regular vs bold produce different but valid widths', () => {
    it('should produce different widths for same text', () => {
      const text = 'Hello World'
      const r = singleLineMeasure(font, text, 16)
      const b = singleLineMeasure(boldFont, text, 16)
      expect(r.width).not.toBe(b.width)
      expect(r.width).toBeGreaterThan(0)
      expect(b.width).toBeGreaterThan(0)
    })
  })
})
