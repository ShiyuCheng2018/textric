import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')

describe('measureBatch()', () => {
  it('should measure multiple texts in one call', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const results = m.measureBatch([
      { text: 'Hello', font: 'Inter', size: 16 },
      { text: 'World', font: 'Inter', size: 16 },
      { text: 'Textric', font: 'Inter', size: 24 },
    ])

    expect(results).toHaveLength(3)
    for (const r of results) {
      expect(r.width).toBeGreaterThan(0)
    }
  })

  it('should return results matching individual measure() calls', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const items = [
      { text: 'Hello', font: 'Inter', size: 16 },
      { text: 'Longer text here', font: 'Inter', size: 14 },
    ]

    const batchResults = m.measureBatch(items)
    const individualResults = items.map(item =>
      m.measure(item.text, { font: item.font, size: item.size })
    )

    for (let i = 0; i < items.length; i++) {
      expect(batchResults[i]!.width).toBeCloseTo(individualResults[i]!.width, 5)
      expect(batchResults[i]!.height).toBeCloseTo(individualResults[i]!.height, 5)
    }
  })

  it('should handle empty batch', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })
    const results = m.measureBatch([])
    expect(results).toEqual([])
  })

  it('should support multi-line items in batch', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const results = m.measureBatch([
      { text: 'Short', font: 'Inter', size: 16 },
      { text: 'This should wrap into multiple lines.', font: 'Inter', size: 14, maxWidth: 80 },
    ])

    expect(results).toHaveLength(2)
    // Second item should have multi-line fields
    const multiline = results[1]!
    if ('lineCount' in multiline) {
      expect(multiline.lineCount).toBeGreaterThan(1)
    }
  })
})
