import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'
import goldenValues from '../fixtures/golden-values.json'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')

// --- COULD-14: LRU capacity configurable ---

describe('maxCachedFonts option', () => {
  it('should accept custom cache size', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
      maxCachedFonts: 50,
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeCloseTo(goldenValues['Inter-Regular-16-Hello'], 1)
  })

  it('should work with default cache size', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    // Just verify it works — internal cache size not observable
    expect(m.measure('Test', { font: 'Inter', size: 16 }).width).toBeCloseTo(goldenValues['Inter-Regular-16-Test'], 1)
  })
})

// --- COULD-15: text decoration info ---

describe('getFontMetrics() — detailed', () => {
  it('should return ascent, descent, and underline info', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const metrics = m.getFontMetrics('Inter', 16)
    expect(metrics).not.toBeNull()
    expect(metrics!.ascent).toBeCloseTo(goldenValues['Inter-Regular-16-ascent'], 1)
    expect(metrics!.descent).toBeCloseTo(goldenValues['Inter-Regular-16-descent'], 1)
    expect(metrics!.unitsPerEm).toBe(2048)
    expect(typeof metrics!.underlineOffset).toBe('number')
    expect(typeof metrics!.underlineThickness).toBe('number')
    expect(metrics!.underlineThickness).toBeGreaterThan(0.1)
  })

  it('should scale with font size', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const m16 = m.getFontMetrics('Inter', 16)!
    const m32 = m.getFontMetrics('Inter', 32)!
    expect(m32.ascent).toBeCloseTo(m16.ascent * 2, 4)
    expect(m32.underlineThickness).toBeCloseTo(m16.underlineThickness * 2, 4)
  })

  it('should return null for unknown font', async () => {
    const m = await createMeasurer({})
    expect(m.getFontMetrics('Unknown', 16)).toBeNull()
  })
})

// --- COULD-16: estimateCharCount ---

describe('estimateCharCount()', () => {
  it('should return a positive number for reasonable width', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const count = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 200 })
    // At 16px, Inter avg char width ~7-9px, so 200/8 ≈ 25 chars
    expect(count).toBeGreaterThan(15)
    expect(count).toBeLessThan(50)
  })

  it('should return more chars for wider containers', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const narrow = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 100 })
    const wide = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 300 })
    expect(wide).toBeGreaterThan(narrow)
  })

  it('should return fewer chars for larger font sizes', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const small = m.estimateCharCount({ font: 'Inter', size: 12, maxWidth: 200 })
    const large = m.estimateCharCount({ font: 'Inter', size: 24, maxWidth: 200 })
    expect(small).toBeGreaterThan(large)
  })

  it('should return reasonable estimate for unknown font', async () => {
    const m = await createMeasurer({})
    const count = m.estimateCharCount({ font: 'Unknown', size: 16, maxWidth: 200 })
    expect(count).toBeGreaterThan(0)
  })

  it('accepts custom sampleText for domain-specific estimation', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const latin = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 500 })
    const narrow = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 500, sampleText: 'iiiiiiiiii' })
    const wide = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 500, sampleText: 'WWWWWWWWWW' })

    expect(narrow).toBeGreaterThan(latin)
    expect(wide).toBeLessThan(latin)
  })

  it('empty sampleText falls back to default sample', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const withDefault = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 500 })
    const withEmpty = m.estimateCharCount({ font: 'Inter', size: 16, maxWidth: 500, sampleText: '' })
    expect(withEmpty).toBe(withDefault)
  })
})
