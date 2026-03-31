import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { createMeasurer } from '../../src/internal/measurer.js'

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

    expect(result.width).toBeGreaterThan(0)
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
    expect(frags[0]!.width).toBeGreaterThan(0)
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
