import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'
import { FontNotFoundError, InvalidOptionsError } from '../../src/internal/errors.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')

describe('measure() — input validation', () => {
  it('should throw InvalidOptionsError when font is empty string', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: '', size: 16 })).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError when size is 0', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Inter', size: 0 })).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError when size is negative', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Inter', size: -1 })).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError when maxWidth is 0', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Inter', size: 16, maxWidth: 0 })).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError when maxWidth is NaN', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Inter', size: 16, maxWidth: NaN })).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError when maxWidth is Infinity', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Inter', size: 16, maxWidth: Infinity })).toThrow(InvalidOptionsError)
  })

  it('should throw InvalidOptionsError when lineHeight is 0', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Inter', size: 16, lineHeight: 0 })).toThrow(InvalidOptionsError)
  })
})

describe('measure() — no fonts loaded', () => {
  it('should throw FontNotFoundError when no fonts available', async () => {
    const m = await createMeasurer({})
    expect(() => m.measure('Hello', { font: 'Inter', size: 16 })).toThrow(FontNotFoundError)
  })

  it('should throw error with actionable message', async () => {
    const m = await createMeasurer({})
    expect(() => m.measure('Hello', { font: 'Inter', size: 16 })).toThrow('is not loaded')
  })
})

describe('loadFont() — error paths', () => {
  it('should throw when path does not exist', async () => {
    const m = await createMeasurer({})
    await expect(
      m.loadFont({ family: 'Test', path: '/nonexistent/font.ttf' })
    ).rejects.toThrow('Failed to load font from path')
  })
})

describe('error class hierarchy', () => {
  it('FontNotFoundError should be instanceof TextricError and Error', async () => {
    const m = await createMeasurer({})
    expect(() => m.measure('Hello', { font: 'Inter', size: 16 })).toThrow(FontNotFoundError)
    expect(() => m.measure('Hello', { font: 'Inter', size: 16 })).toThrow(Error)
  })

  it('InvalidOptionsError should be instanceof TextricError', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: '', size: 16 })).toThrow(InvalidOptionsError)
  })
})
