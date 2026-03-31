import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'
import { InvalidOptionsError } from '../../src/internal/errors.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')

describe('measureRichText — input validation', () => {
  it('should throw InvalidOptionsError for span with empty font', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measureRichText([
      { text: 'Hello', font: '', size: 16 },
    ])).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError for span with size=0', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measureRichText([
      { text: 'Hello', font: 'Inter', size: 0 },
    ])).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError for span with negative size', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measureRichText([
      { text: 'Hello', font: 'Inter', size: -5 },
    ])).toThrow(InvalidOptionsError)
  })
})

describe('measure() — maxLines without maxWidth silently ignored', () => {
  it('should silently ignore maxLines when maxWidth is not set', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16, maxLines: 2 })
    expect(result.width).toBeGreaterThan(0)
    expect('lines' in result).toBe(false)
  })

  it('should silently ignore maxHeight when maxWidth is not set', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16, maxHeight: 40 })
    expect(result.width).toBeGreaterThan(0)
    expect('lines' in result).toBe(false)
  })
})
