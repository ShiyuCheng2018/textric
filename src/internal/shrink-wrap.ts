import { wrapText } from './wrap-core.js'
import type { MeasureWidthFn, ShrinkWrapResult } from '../types.js'

interface ShrinkWrapInternalOptions {
  lineHeight: number
  maxLines: number
  letterSpacing?: number
}

/**
 * Binary-search for the narrowest container width
 * that fits text within the given maxLines.
 */
export function shrinkWrap(
  text: string,
  measureWidth: MeasureWidthFn,
  options: ShrinkWrapInternalOptions,
): ShrinkWrapResult {
  if (text.length === 0) {
    return { width: 0, height: 0, lines: [''], lineCount: 1 }
  }

  const { lineHeight, maxLines, letterSpacing } = options

  // Upper bound: full single-line width (ceil to integer for search)
  const fullWidth = measureWidth(text)
  let hi = Math.ceil(fullWidth)

  // Lower bound: at least 1px
  let lo = 1

  // Binary search: find the smallest integer width where totalLineCount <= maxLines
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const result = wrapText(text, mid, measureWidth, { lineHeight, letterSpacing })

    if (result.totalLineCount <= maxLines) {
      hi = mid
    } else {
      lo = mid + 1
    }
  }

  // lo is the smallest integer width that fits in maxLines.
  // Get actual max line width at this width (sub-pixel precision).
  const finalResult = wrapText(text, lo, measureWidth, { lineHeight, letterSpacing })
  return {
    width: finalResult.maxLineWidth,
    height: finalResult.height,
    lines: finalResult.lines,
    lineCount: finalResult.lineCount,
  }
}
