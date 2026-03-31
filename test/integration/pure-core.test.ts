/**
 * Tests that verify Textric core is pure computation — zero network I/O.
 * These tests define the post-refactor behavior contract.
 */
import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createMeasurer } from '../../src/internal/measurer.js'
import { FontNotFoundError } from '../../src/internal/errors.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')
const FONT_BUFFER = readFileSync(REGULAR_PATH)
const FONT_ARRAY_BUFFER = FONT_BUFFER.buffer.slice(
  FONT_BUFFER.byteOffset, FONT_BUFFER.byteOffset + FONT_BUFFER.byteLength,
)

// --- Core contract: only path and data sources ---

describe('createMeasurer — font sources', () => {
  it('should load font from local file path', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeGreaterThan(0)
  })

  it('should load font from ArrayBuffer data', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', data: FONT_ARRAY_BUFFER, weight: 400 }],
    })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeGreaterThan(0)
  })

  it('should load multiple font variants', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })
    const info = m.getFontInfo('Inter')
    expect(info!.weights).toContain(400)
    expect(info!.weights).toContain(700)
  })

  it('should work with empty fonts array', async () => {
    const m = await createMeasurer({ fonts: [] })
    expect(m).toBeDefined()
  })
})

// --- Core contract: no fallback to other families ---

describe('font resolution — strict by default', () => {
  it('should throw FontNotFoundError for unknown font', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.measure('Hello', { font: 'Unknown', size: 16 }))
      .toThrow(FontNotFoundError)
  })

  it('should allow weight fallback within same family', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    // Request 700, only 400 loaded — same family fallback is OK
    const result = m.measure('Hello', { font: 'Inter', size: 16, weight: 700 })
    expect(result.width).toBeGreaterThan(0)
    expect(result.resolvedFont.weight).toBe(400)
  })

  it('should throw when no fonts loaded at all', async () => {
    const m = await createMeasurer({ fonts: [] })
    expect(() => m.measure('Hello', { font: 'Inter', size: 16 }))
      .toThrow(FontNotFoundError)
  })
})

// --- Core contract: loadFont only supports path and data ---

describe('loadFont — path and data only', () => {
  it('should load font from path at runtime', async () => {
    const m = await createMeasurer({ fonts: [] })
    await m.loadFont({ family: 'Inter', weight: 400, path: REGULAR_PATH })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeGreaterThan(0)
  })

  it('should load font from data at runtime', async () => {
    const m = await createMeasurer({ fonts: [] })
    await m.loadFont({ family: 'Inter', weight: 400, data: FONT_ARRAY_BUFFER })
    const result = m.measure('Hello', { font: 'Inter', size: 16 })
    expect(result.width).toBeGreaterThan(0)
  })

  it('should throw when no path or data provided', async () => {
    const m = await createMeasurer({ fonts: [] })
    await expect(m.loadFont({ family: 'Inter' })).rejects.toThrow()
  })
})

// --- Core contract: no measureAsync, no preload ---

describe('font resolution — throw for all APIs', () => {
  it('should throw from fitText for unknown font', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.fitText('Hello', { font: 'Unknown', maxWidth: 200, maxHeight: 50 }))
      .toThrow(FontNotFoundError)
  })

  it('should throw from shrinkWrap for unknown font', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(() => m.shrinkWrap('Hello', { font: 'Unknown', size: 16, maxLines: 2 }))
      .toThrow(FontNotFoundError)
  })
})

describe('Measurer API surface', () => {
  it('should have measure()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(m.measure).toBeTypeOf('function')
  })

  it('should have measureRichText()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(m.measureRichText).toBeTypeOf('function')
  })

  it('should have measureBatch()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(m.measureBatch).toBeTypeOf('function')
  })

  it('should have shrinkWrap(), fitText(), getFontInfo(), getFontMetrics(), estimateCharCount()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(m.shrinkWrap).toBeTypeOf('function')
    expect(m.fitText).toBeTypeOf('function')
    expect(m.getFontInfo).toBeTypeOf('function')
    expect(m.getFontMetrics).toBeTypeOf('function')
    expect(m.estimateCharCount).toBeTypeOf('function')
  })

  it('should NOT expose measureAsync, preload, or other removed APIs', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    }) as Record<string, unknown>
    expect(m).not.toHaveProperty('measureAsync')
    expect(m).not.toHaveProperty('measureRichTextAsync')
    expect(m).not.toHaveProperty('measureBatchAsync')
    expect(m).not.toHaveProperty('preload')
  })

  it('should have loadFont()', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    expect(m.loadFont).toBeTypeOf('function')
  })
})

// --- CreateMeasurerOptions should be minimal ---

describe('createMeasurer options — minimal', () => {
  it('should accept maxCachedFonts', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
      maxCachedFonts: 50,
    })
    expect(m.measure('Hi', { font: 'Inter', size: 16 }).width).toBeGreaterThan(0)
  })
})
