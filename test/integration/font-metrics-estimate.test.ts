import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')

// --- COULD-14: LRU capacity configurable ---

describe('maxCachedFonts option', () => {
  it('should accept custom cache size', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
      maxCachedFonts: 50,
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeGreaterThan(0)
  })

  it('should default to 100 when not specified', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    // Just verify it works — internal cache size not observable
    expect(m.measure('Test', { font: 'Inter', size: 16 }).width).toBeGreaterThan(0)
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
    expect(metrics!.ascent).toBeGreaterThan(0)
    expect(metrics!.descent).toBeGreaterThan(0)
    expect(metrics!.unitsPerEm).toBe(2048)
    expect(typeof metrics!.underlineOffset).toBe('number')
    expect(typeof metrics!.underlineThickness).toBe('number')
    expect(metrics!.underlineThickness).toBeGreaterThan(0)
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
    expect(count).toBeGreaterThan(0)
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
})
