import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'
import goldenValues from '../fixtures/golden-values.json'
// FontNotFoundError tests moved to pure-core.test.ts

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')

// --- MUST-6: ShrinkWrap returns complete result ---

describe('shrinkWrap() — complete result', () => {
  it('should return height, lines, and lineCount', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.shrinkWrap('Hello World Test', {
      font: 'Inter', size: 16, maxLines: 2,
    })
    // Width must be at least one word wide ("Hello" ≈ 38px at 16px Inter)
    expect(result.width).toBeGreaterThan(30)
    expect(result.height).toBeCloseTo(16 * 1.2 * result.lineCount, 1)
    expect(result.lines).toBeInstanceOf(Array)
    expect(result.lines.length).toBe(result.lineCount)
    expect(result.lineCount).toBeLessThanOrEqual(2)
  })

  it('should return height consistent with measure()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const shrunk = m.shrinkWrap('Some text to wrap', {
      font: 'Inter', size: 14, maxLines: 2, lineHeight: 1.5,
    })
    const verify = m.measure('Some text to wrap', {
      font: 'Inter', size: 14, maxWidth: shrunk.width, lineHeight: 1.5,
    })
    expect(shrunk.height).toBeCloseTo(verify.height, 2)
  })
})

// --- MUST-9: Single-line measure returns baseline ---

describe('measure() — baseline info', () => {
  it('should return ascent and descent for single-line measurement', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.ascent).toBeCloseTo(goldenValues['Inter-Regular-16-ascent'], 4)
    expect(result.descent).toBeCloseTo(goldenValues['Inter-Regular-16-descent'], 4)
    expect(result.ascent + result.descent).toBeLessThanOrEqual(result.height * 1.5)
  })

  it('should scale ascent/descent with fontSize', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const r16 = m.measure('Hello', { font: 'Inter', size: 16 })
    const r32 = m.measure('Hello', { font: 'Inter', size: 32 })
    expect(r32.ascent).toBeCloseTo(r16.ascent * 2, 4)
    expect(r32.descent).toBeCloseTo(r16.descent * 2, 4)
  })

  it('should match Inter font metrics', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Test', { font: 'Inter', size: 16 })
    // Inter: ascender=1984, descender=-494, unitsPerEm=2048
    expect(result.ascent).toBeCloseTo((1984 / 2048) * 16, 4)
    expect(result.descent).toBeCloseTo((494 / 2048) * 16, 4)
  })
})

// --- Font resolution: always strict (no cross-family fallback) ---
// Covered in pure-core.test.ts
