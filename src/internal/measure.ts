import type opentype from 'opentype.js'
import type { MeasureWidthFn, SpanMetrics } from '../types.js'
import { graphemeCount } from './grapheme.js'

interface SingleLineResult {
  width: number
  height: number
}

interface SingleLineOptions {
  lineHeight?: number
  letterSpacing?: number
}

/**
 * Measure a single line of text using an opentype.js Font object.
 *
 * Returns pixel-accurate width (from glyph advance widths + kerning)
 * and height (fontSize * lineHeight multiplier).
 */
export function singleLineMeasure(
  font: opentype.Font,
  text: string,
  fontSize: number,
  options?: SingleLineOptions,
): SingleLineResult {
  const lineHeight = options?.lineHeight ?? 1.2
  const letterSpacing = options?.letterSpacing ?? 0

  if (text.length === 0) {
    return { width: 0, height: fontSize * lineHeight }
  }

  const baseWidth = font.getAdvanceWidth(text, fontSize)
  const charCount = graphemeCount(text)
  const spacingTotal = letterSpacing * (charCount - 1)

  return {
    width: baseWidth + spacingTotal,
    height: fontSize * lineHeight,
  }
}

/**
 * Create a MeasureWidthFn closure for use with wrapText.
 */
export function createMeasureWidthFn(
  font: opentype.Font,
  fontSize: number,
  letterSpacing = 0,
): MeasureWidthFn {
  return (text: string) => {
    if (text.length === 0) return 0
    const baseWidth = font.getAdvanceWidth(text, fontSize)
    const charCount = graphemeCount(text)
    return baseWidth + letterSpacing * (charCount - 1)
  }
}

/**
 * Check if a font is missing glyphs for any character in the text.
 * A missing glyph is detected when charToGlyph returns the .notdef glyph (index 0).
 */
export function hasMissingGlyphs(font: opentype.Font, text: string): boolean {
  for (const char of text) {
    const glyph = font.charToGlyph(char)
    if (glyph.index === 0) return true
  }
  return false
}

/**
 * Extract font ascent/descent metrics in pixels for a given fontSize.
 *
 * Uses the font's ascender/descender values from the head/hhea tables,
 * scaled to the requested fontSize.
 */
export function getFontMetrics(font: opentype.Font, fontSize: number): SpanMetrics {
  const scale = fontSize / font.unitsPerEm
  return {
    ascent: font.ascender * scale,
    descent: Math.abs(font.descender) * scale,
  }
}
