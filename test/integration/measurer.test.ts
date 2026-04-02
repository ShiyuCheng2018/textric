import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'
import { FontNotFoundError } from '../../src/internal/errors.js'
import goldenValues from '../fixtures/golden-values.json'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')

describe('measure() — golden values (pinned)', () => {
  let m: Awaited<ReturnType<typeof createMeasurer>>

  beforeAll(async () => {
    m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })
  })

  it('should match pinned width for "Hello" at 16px', () => {
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeCloseTo(goldenValues['Inter-Regular-16-Hello'], 1)
  })

  it('should match pinned width for "Hello World" at 16px', () => {
    const result = m.measure('Hello World', { font: 'Inter', size: 16 })
    expect(result.width).toBeCloseTo(goldenValues['Inter-Regular-16-HelloWorld'], 1)
  })

  it('should match pinned width for bold "Hello" at 16px', () => {
    const result = m.measure('Hello', { font: 'Inter', size: 16, weight: 700 })
    expect(result.width).toBeCloseTo(goldenValues['Inter-Bold-16-Hello'], 1)
  })

  it('bold and regular produce different widths with pinned values', () => {
    const regular = m.measure('Hello World', { font: 'Inter', size: 16 })
    const bold = m.measure('Hello World', { font: 'Inter', size: 16, weight: 700 })
    expect(regular.width).toBeCloseTo(goldenValues['Inter-Regular-16-HelloWorld'], 1)
    expect(bold.width).toBeCloseTo(goldenValues['Inter-Bold-16-HelloWorld'], 1)
    expect(regular.width).not.toBeCloseTo(bold.width, 0)
  })
})

describe('createMeasurer', () => {
  it('should create a measurer with local font files', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
      ],
    })
    expect(m).toBeDefined()
    expect(m.measure).toBeTypeOf('function')
  })

  it('should create a measurer with no pre-loaded fonts', async () => {
    const m = await createMeasurer({})
    expect(m).toBeDefined()
  })

  it('should create a measurer with empty fonts array', async () => {
    const m = await createMeasurer({ fonts: [] })
    expect(m).toBeDefined()
  })

  it('should load multiple font variants', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })
    const info = m.getFontInfo('Inter')
    expect(info).not.toBeNull()
    expect(info!.weights).toContain(400)
    expect(info!.weights).toContain(700)
  })
})

describe('measure() — single line', () => {
  it('should measure single-line text', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello World', { font: 'Inter', size: 16 })
    expect(result.width).toBeCloseTo(goldenValues['Inter-Regular-16-HelloWorld'], 1)
    expect(result.height).toBeCloseTo(16 * 1.2)
  })

  it('should return zero width for empty string', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('', { font: 'Inter', size: 16 })
    expect(result.width).toBe(0)
  })

  it('should respect custom lineHeight', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16, lineHeight: 2.0 })
    expect(result.height).toBeCloseTo(16 * 2.0)
  })

  it('should apply letterSpacing', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const base = m.measure('Hello', { font: 'Inter', size: 16 })
    const spaced = m.measure('Hello', { font: 'Inter', size: 16, letterSpacing: 2 })
    expect(spaced.width).toBeCloseTo(base.width + 2 * 4) // 5 chars, 4 gaps
  })

  it('should use bold font when weight matches', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })
    const regular = m.measure('Hello', { font: 'Inter', size: 16, weight: 400 })
    const bold = m.measure('Hello', { font: 'Inter', size: 16, weight: 700 })
    // Bold glyphs have different advance widths
    expect(regular.width).not.toBe(bold.width)
  })
})

describe('measure() — multi-line', () => {
  it('should wrap text with maxWidth', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure(
      'This is a longer sentence that should definitely wrap into multiple lines.',
      { font: 'Inter', size: 14, maxWidth: 150 },
    )
    expect(result.lineCount).toBeGreaterThan(1)
    expect(result.lines.length).toBe(result.lineCount)
    expect(result.lineWidths.length).toBe(result.lineCount)
    // Verify all lines respect maxWidth
    for (const w of (result as any).lineWidths) {
      expect(w).toBeLessThanOrEqual(150)
    }
  })

  it('should respect maxLines truncation', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure(
      'Line one. Line two. Line three. Line four. Line five. Line six.',
      { font: 'Inter', size: 14, maxWidth: 100, maxLines: 2 },
    )
    expect(result.lineCount).toBe(2)
    expect(result.truncated).toBe(true)
    expect(result.totalLineCount).toBeGreaterThan(2)
  })

  it('should compute correct height for multi-line', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('A\nB\nC', {
      font: 'Inter',
      size: 16,
      maxWidth: 500,
      lineHeight: 1.5,
    })
    expect(result.height).toBeCloseTo(result.lineCount * 16 * 1.5)
  })
})

describe('measure() — font not found', () => {
  it('should throw FontNotFoundError for unknown font family', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'NonExistent', size: 16 }))
      .toThrow(FontNotFoundError)
  })

  it('should use weight fallback within same family', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16, weight: 700 })
    expect(result.width).toBeCloseTo(goldenValues['Inter-Regular-16-Hello'], 1)
  })
})

describe('loadFont()', () => {
  it('should load a font at runtime', async () => {
    const m = await createMeasurer({})
    await m.loadFont({ family: 'Inter', weight: 400, path: REGULAR_PATH })
    const info = m.getFontInfo('Inter')
    expect(info).not.toBeNull()
    expect(info!.weights).toContain(400)
  })

  it('should allow measuring with a dynamically loaded font', async () => {
    const m = await createMeasurer({})
    await m.loadFont({ family: 'Inter', weight: 400, path: REGULAR_PATH })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeCloseTo(goldenValues['Inter-Regular-16-Hello'], 1)
  })
})

describe('getFontInfo()', () => {
  it('should return info for loaded fonts', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })
    const info = m.getFontInfo('Inter')
    expect(info).toEqual({
      weights: [400, 700],
      styles: ['normal'],
    })
  })

  it('should return null for unknown font', async () => {
    const m = await createMeasurer({})
    expect(m.getFontInfo('Unknown')).toBeNull()
  })
})
