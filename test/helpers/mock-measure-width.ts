import type { MeasureWidthFn, MeasureSpanWidthFn, GetSpanMetricsFn } from '../../src/types.js'

/**
 * Creates a mock MeasureWidthFn where every character has fixed width.
 * Default: 10px per character.
 */
export function createMockMeasureWidth(charWidth = 10): MeasureWidthFn {
  return (text: string) => text.length * charWidth
}

/**
 * Creates a mock MeasureSpanWidthFn for rich text testing.
 * Width = text.length * span.size * factor.
 * Default factor 0.6 approximates typical Latin character width ratio.
 */
export function createMockSpanMeasureWidth(factor = 0.6): MeasureSpanWidthFn {
  return (text: string, style) => text.length * style.size * factor
}

/**
 * Creates a mock GetSpanMetricsFn for rich text testing.
 * Uses typical proportions: ascent ≈ 0.8 * size, descent ≈ 0.2 * size.
 */
export function createMockGetMetrics(): GetSpanMetricsFn {
  return (style) => ({
    ascent: style.size * 0.8,
    descent: style.size * 0.2,
  })
}
