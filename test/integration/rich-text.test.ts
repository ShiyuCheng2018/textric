import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'
import goldenValues from '../fixtures/golden-values.json'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')

describe('measureRichText() — single span', () => {
  it('should produce consistent width with measure() for single span', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const plain = m.measure('Hello World', { font: 'Inter', size: 16 })
    const rich = m.measureRichText(
      [{ text: 'Hello World', font: 'Inter', size: 16 }],
    )

    expect(rich.width).toBeCloseTo(plain.width, 5)
    expect(rich.lineCount).toBe(1)
    expect(rich.lines[0]!.fragments).toHaveLength(1)
  })

  it('should produce consistent height with measure() for single span', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const plain = m.measure('Hello', { font: 'Inter', size: 16, lineHeight: 1.5 })
    const rich = m.measureRichText(
      [{ text: 'Hello', font: 'Inter', size: 16 }],
      { lineHeight: 1.5 },
    )

    expect(rich.height).toBeCloseTo(plain.height, 5)
  })
})

describe('measureRichText() — multi-span', () => {
  it('should measure mixed weight spans', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })

    const result = m.measureRichText([
      { text: 'Revenue increased ', font: 'Inter', size: 14 },
      { text: '23%', font: 'Inter', size: 14, weight: 700 },
      { text: ' this week', font: 'Inter', size: 14 },
    ])

    expect(result.width).toBeGreaterThan(50)
    expect(result.lineCount).toBe(1)
    expect(result.lines[0]!.fragments.length).toBeGreaterThanOrEqual(2)
  })

  it('should compute correct x offsets for multi-span', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })

    const result = m.measureRichText([
      { text: 'AB', font: 'Inter', size: 16, weight: 400 },
      { text: 'CD', font: 'Inter', size: 16, weight: 700 },
    ])

    const frags = result.lines[0]!.fragments
    expect(frags[0]!.x).toBe(0)
    expect(frags[0]!.width).toBeCloseTo(goldenValues['Inter-Regular-16-AB'], 4)
    expect(frags[1]!.x).toBeCloseTo(frags[0]!.width, 5)
  })

  it('should measure mixed font sizes with correct baseline', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })

    // Price tag: "$12" large + "/month" small
    const result = m.measureRichText([
      { text: '$12', font: 'Inter', size: 32, weight: 700 },
      { text: '/month', font: 'Inter', size: 14 },
    ])

    expect(result.lineCount).toBe(1)
    const line = result.lines[0]!
    // Ascent should come from the larger font (size 32)
    expect(line.ascent).toBeGreaterThan(line.descent)
    expect(line.baseline).toBeCloseTo(line.y + line.ascent)
  })
})

describe('measureRichText() — wrapping', () => {
  it('should wrap rich text within maxWidth', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })

    const result = m.measureRichText(
      [
        { text: 'This is a ', font: 'Inter', size: 14 },
        { text: 'bold phrase', font: 'Inter', size: 14, weight: 700 },
        { text: ' inside a paragraph that wraps.', font: 'Inter', size: 14 },
      ],
      { maxWidth: 150 },
    )

    expect(result.lineCount).toBeGreaterThan(1)
    expect(result.truncated).toBe(false)
    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(150)
    }
  })

  it('should truncate rich text with maxLines', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const result = m.measureRichText(
      [{ text: 'Word '.repeat(50), font: 'Inter', size: 14 }],
      { maxWidth: 100, maxLines: 2 },
    )

    expect(result.lineCount).toBe(2)
    expect(result.truncated).toBe(true)
    expect(result.totalLineCount).toBeGreaterThan(2)
  })
})

describe('measureRichText() — unknown font throws', () => {
  it('should throw FontNotFoundError when a span font is not loaded', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    expect(() => m.measureRichText([
      { text: 'Hello ', font: 'Inter', size: 16 },
      { text: 'World', font: 'Unknown', size: 16 },
    ])).toThrow()
  })
})

describe('measureRichText() — empty input', () => {
  it('should return empty result for empty spans', async () => {
    const m = await createMeasurer({
      fonts: [{ family: 'Inter', path: REGULAR_PATH, weight: 400 }],
    })

    const result = m.measureRichText([])
    expect(result.lineCount).toBe(0)
    expect(result.lines).toEqual([])
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })
})

describe('measureRichText() — per-line dynamic heights', () => {
  it('mixed font sizes produce per-line dynamic heights', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })

    const result = m.measureRichText([
      { text: 'Title\n', font: 'Inter', size: 24, weight: 700 },
      { text: 'Body text here', font: 'Inter', size: 12 },
    ], { maxWidth: 400, lineHeight: 1.2 })

    // Line 0 (24px font): height = 24 * 1.2 = 28.8
    expect(result.lines[0]!.height).toBeCloseTo(28.8, 1)
    // Line 1 (12px font): height = 12 * 1.2 = 14.4
    expect(result.lines[1]!.height).toBeCloseTo(14.4, 1)
    // Total height = 28.8 + 14.4 = 43.2
    expect(result.height).toBeCloseTo(43.2, 1)
    // y positions
    expect(result.lines[0]!.y).toBeCloseTo(0)
    expect(result.lines[1]!.y).toBeCloseTo(28.8, 1)
  })
})

describe('measureRichText() — README examples', () => {
  it('should measure $49.99 price tag with pinned values', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })

    const result = m.measureRichText([
      { text: '$', font: 'Inter', size: 14, weight: 400 },
      { text: '49', font: 'Inter', size: 32, weight: 700 },
      { text: '.99', font: 'Inter', size: 14, weight: 400 },
    ])

    expect(result.lineCount).toBe(1)
    const frags = result.lines[0]!.fragments
    expect(frags).toHaveLength(3)

    // Fragment widths match golden values
    expect(frags[0]!.width).toBeCloseTo(goldenValues['Inter-Regular-14-$'], 4)
    expect(frags[1]!.width).toBeCloseTo(goldenValues['Inter-Bold-32-49'], 4)
    expect(frags[2]!.width).toBeCloseTo(goldenValues['Inter-Regular-14-.99'], 4)

    // x positions accumulate
    expect(frags[0]!.x).toBe(0)
    expect(frags[1]!.x).toBeCloseTo(frags[0]!.width, 1)
    expect(frags[2]!.x).toBeCloseTo(frags[0]!.width + frags[1]!.width, 1)

    // Total width = sum of fragments
    expect(result.width).toBeCloseTo(frags[0]!.width + frags[1]!.width + frags[2]!.width, 1)
  })
})

describe('alignRichTextResult() — integration', () => {
  it('center-aligns real measureRichText output', async () => {
    const m = await createMeasurer({
      fonts: [
        { family: 'Inter', path: REGULAR_PATH, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
    })
    const { alignRichTextResult } = await import('../../src/align.js')

    const result = m.measureRichText([
      { text: 'Hello ', font: 'Inter', size: 16, weight: 700 },
      { text: 'World', font: 'Inter', size: 16 },
    ], { maxWidth: 300 })

    const centered = alignRichTextResult(result, 300, 'center')

    // All fragments should be shifted right
    expect(centered.lines[0]!.fragments[0]!.x).toBeGreaterThan(0)
    // Offset should be (300 - lineWidth) / 2
    const expectedOffset = (300 - result.lines[0]!.width) / 2
    expect(centered.lines[0]!.fragments[0]!.x).toBeCloseTo(expectedOffset, 4)
  })
})
