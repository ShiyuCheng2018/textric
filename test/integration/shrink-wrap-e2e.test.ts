import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')

describe('shrinkWrap() end-to-end', () => {
  it('should find optimal width for 2 lines', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const full = m.measure('AI-Generated Dashboard Title', { font: 'Inter', size: 18 })
    const shrunk = m.shrinkWrap('AI-Generated Dashboard Title', {
      font: 'Inter',
      size: 18,
      maxLines: 2,
    })

    // Shrunk width should be narrower than full single-line width
    expect(shrunk.width).toBeLessThan(full.width)
    expect(shrunk.width).toBeGreaterThan(0)

    // Verify that the text actually fits in 2 lines at this width
    const verify = m.measure('AI-Generated Dashboard Title', {
      font: 'Inter',
      size: 18,
      maxWidth: shrunk.width,
    })
    if ('lineCount' in verify) {
      expect(verify.lineCount).toBeLessThanOrEqual(2)
    }
  })

  it('should return full width for maxLines=1', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const full = m.measure('Hello World', { font: 'Inter', size: 16 })
    const shrunk = m.shrinkWrap('Hello World', {
      font: 'Inter',
      size: 16,
      maxLines: 1,
    })

    // For 1 line, width must accommodate the full text
    expect(shrunk.width).toBeGreaterThanOrEqual(full.width - 1) // allow tiny float diff
  })
})
