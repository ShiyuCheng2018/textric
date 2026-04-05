export type { TextAlign, RichTextResult } from './types.js'
import type { RichTextResult, TextAlign } from './types.js'

/**
 * Compute x-offsets for center/right alignment of plain text lines.
 * Returns an array of pixel offsets (one per line) to add to x position when rendering.
 * Note: if a line's width exceeds maxWidth, the offset will be negative (content overflows left).
 */
export function alignLines(
  lineWidths: number[],
  maxWidth: number,
  align: TextAlign,
): number[] {
  return lineWidths.map(w => {
    if (align === 'left') return 0
    if (align === 'center') return (maxWidth - w) / 2
    return maxWidth - w // right
  })
}

/**
 * Return a new RichTextResult with fragment x-positions adjusted for alignment.
 * Does not mutate the input.
 * Note: `result.width` still reflects content width, not container width.
 */
export function alignRichTextResult(
  result: RichTextResult,
  maxWidth: number,
  align: TextAlign,
): RichTextResult {
  if (align === 'left') return result
  return {
    ...result,
    lines: result.lines.map(line => {
      const offset = align === 'center'
        ? (maxWidth - line.width) / 2
        : maxWidth - line.width
      return {
        ...line,
        fragments: line.fragments.map(f => ({ ...f, x: f.x + offset })),
      }
    }),
  }
}
