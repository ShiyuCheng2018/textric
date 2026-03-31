/**
 * Compute effective max visible lines from maxLines and maxHeight constraints.
 * Returns the stricter of the two (or undefined if neither is set).
 */
export function resolveMaxLines(
  lineHeight: number,
  maxLines: number | undefined,
  maxHeight: number | undefined,
): number | undefined {
  const fromMaxLines = maxLines
  const fromMaxHeight = maxHeight !== undefined
    ? Math.floor(maxHeight / lineHeight)
    : undefined

  if (fromMaxLines !== undefined && fromMaxHeight !== undefined) {
    return Math.min(fromMaxLines, fromMaxHeight)
  }
  return fromMaxLines ?? fromMaxHeight
}
