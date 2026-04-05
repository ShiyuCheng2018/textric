import { isCJK, isNoStartChar, isNoEndChar } from './cjk.js'
import { resolveMaxLines } from './utils.js'
import { graphemes } from './grapheme.js'
import type { MeasureWidthFn, WrapOptions, WrapResult } from '../types.js'

export function wrapText(
  text: string,
  maxWidth: number,
  measureWidth: MeasureWidthFn,
  options: WrapOptions,
): WrapResult {
  const { lineHeight, maxLines, maxHeight, paragraphSpacing = 0, ellipsis, indent = 0, hangingIndent = 0 } = options

  const effectiveMaxLines = resolveMaxLines(lineHeight, maxLines, maxHeight)

  // Normalize line endings, then split by explicit newlines
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n')

  const allLines: string[] = []
  const allWidths: number[] = []
  // Track which lines start a new paragraph (for paragraphSpacing)
  const isParagraphStart: boolean[] = []
  let totalLineCount = 0

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi]!
    if (para === '') {
      totalLineCount++
      allLines.push('')
      allWidths.push(0)
      isParagraphStart.push(pi > 0)
      continue
    }

    const wrapped = wrapParagraph(para, maxWidth, measureWidth, indent, hangingIndent)
    for (let li = 0; li < wrapped.length; li++) {
      totalLineCount++
      allLines.push(wrapped[li]!.text)
      allWidths.push(wrapped[li]!.width)
      isParagraphStart.push(li === 0 && pi > 0)
    }
  }

  // Apply truncation
  const visibleCount = effectiveMaxLines !== undefined
    ? Math.min(allLines.length, effectiveMaxLines)
    : allLines.length

  let visibleLines = allLines.slice(0, visibleCount)
  const visibleWidths = allWidths.slice(0, visibleCount)
  const truncated = visibleCount < totalLineCount

  // Apply ellipsis to last visible line if truncated
  if (truncated && ellipsis && visibleLines.length > 0) {
    const lastIdx = visibleLines.length - 1
    const lastLine = visibleLines[lastIdx]!
    const ellipsisWidth = measureWidth(ellipsis)
    const available = maxWidth - ellipsisWidth

    // Only apply ellipsis if it fits within maxWidth
    if (available >= 0) {
      const chars = graphemes(lastLine)
      let lo = 0
      let hi = chars.length
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        if (measureWidth(chars.slice(0, mid).join('')) <= available) {
          lo = mid
        } else {
          hi = mid - 1
        }
      }
      const truncatedLine = chars.slice(0, lo).join('') + ellipsis
      visibleLines = [...visibleLines]
      visibleLines[lastIdx] = truncatedLine
      visibleWidths[lastIdx] = measureWidth(truncatedLine)
    }
    // If ellipsis itself exceeds maxWidth, skip it — keep original truncated text
  }

  // Compute height with paragraphSpacing, and trim lines if height exceeds maxHeight
  let finalCount = visibleCount
  let paragraphBreaks = isParagraphStart.slice(0, finalCount).filter(Boolean).length
  let height = finalCount * lineHeight + paragraphBreaks * paragraphSpacing

  if (maxHeight !== undefined && paragraphSpacing > 0) {
    while (finalCount > 0 && height > maxHeight) {
      finalCount--
      paragraphBreaks = isParagraphStart.slice(0, finalCount).filter(Boolean).length
      height = finalCount * lineHeight + paragraphBreaks * paragraphSpacing
    }
  }

  const finalLines = visibleLines.slice(0, finalCount)
  const finalWidths = visibleWidths.slice(0, finalCount)
  const finalTruncated = finalCount < totalLineCount

  return {
    lines: finalLines,
    lineCount: finalCount,
    totalLineCount,
    truncated: finalTruncated,
    height,
    maxLineWidth: finalWidths.reduce((max, w) => w > max ? w : max, 0),
  }
}

interface WrappedLine {
  text: string
  width: number
}

function wrapParagraph(
  text: string,
  maxWidth: number,
  measureWidth: MeasureWidthFn,
  indent = 0,
  hangingIndent = 0,
): WrappedLine[] {
  const tokens = applyKinsoku(tokenize(text))

  if (tokens.length === 0) {
    return [{ text: '', width: 0 }]
  }

  const lines: WrappedLine[] = []
  let currentTokens: string[] = []
  let currentWidth = 0 // accumulated width (fast path)
  let isFirstLine = true

  function effectiveMaxWidth(): number {
    if (isFirstLine) return maxWidth - indent
    return maxWidth - hangingIndent
  }

  function pushLine(line: WrappedLine): void {
    lines.push(line)
    isFirstLine = false
  }

  for (const token of tokens) {
    const tokenWidth = measureWidth(token)
    const emw = effectiveMaxWidth()

    // If single token exceeds effective maxWidth, character-break it
    // Using inline logic instead of charBreak() so effectiveMaxWidth() updates per line
    if (tokenWidth > emw && currentTokens.length === 0) {
      const chars = graphemes(token)
      let acc = ''
      for (const ch of chars) {
        const trial = acc + ch
        const lineMaxW = effectiveMaxWidth()
        if (measureWidth(trial) > lineMaxW && acc.length > 0) {
          pushLine({ text: acc, width: measureWidth(acc) })
          acc = ch
        } else {
          acc = trial
        }
      }
      if (acc.length > 0) {
        currentTokens = [acc]
        currentWidth = measureWidth(acc)
      }
      continue
    }

    const trialWidth = currentWidth + tokenWidth

    // Fast path: clearly fits (with margin for kerning)
    if (trialWidth <= emw) {
      currentTokens.push(token)
      currentWidth = trialWidth
    } else if (trialWidth <= emw * 1.01 && currentTokens.length > 0) {
      // Near boundary — do precise measurement to account for kerning
      const preciseWidth = measureWidth(currentTokens.join('') + token)
      if (preciseWidth <= emw) {
        currentTokens.push(token)
        currentWidth = preciseWidth
      } else {
        // Doesn't fit — flush current line
        const lineText = trimEnd(currentTokens.join(''))
        pushLine({ text: lineText, width: measureWidth(lineText) })
        if (token.trim() === '') {
          currentTokens = []
          currentWidth = 0
          continue
        }
        const emw2 = effectiveMaxWidth()
        if (tokenWidth > emw2) {
          const broken = charBreak(token, emw2, measureWidth)
          for (let i = 0; i < broken.length - 1; i++) {
            pushLine(broken[i]!)
          }
          const last = broken[broken.length - 1]!
          currentTokens = [last.text]
          currentWidth = last.width
        } else {
          currentTokens = [token]
          currentWidth = tokenWidth
        }
      }
    } else {
      // Clearly doesn't fit — flush current line
      if (currentTokens.length > 0) {
        const lineText = trimEnd(currentTokens.join(''))
        pushLine({ text: lineText, width: measureWidth(lineText) })
      }

      if (token.trim() === '') {
        currentTokens = []
        currentWidth = 0
        continue
      }

      const emw3 = effectiveMaxWidth()
      if (tokenWidth > emw3) {
        const broken = charBreak(token, emw3, measureWidth)
        for (let i = 0; i < broken.length - 1; i++) {
          pushLine(broken[i]!)
        }
        const last = broken[broken.length - 1]!
        currentTokens = [last.text]
        currentWidth = last.width
      } else {
        currentTokens = [token]
        currentWidth = tokenWidth
      }
    }
  }

  // Flush remaining
  if (currentTokens.length > 0) {
    const lineText = trimEnd(currentTokens.join(''))
    pushLine({ text: lineText, width: measureWidth(lineText) })
  }

  if (lines.length === 0) {
    return [{ text: '', width: 0 }]
  }

  return lines
}

/**
 * Tokenize text into wrappable segments:
 * - Latin words (non-space, non-CJK runs)
 * - Space runs
 * - Individual CJK characters
 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  let i = 0
  const chars = graphemes(text)

  while (i < chars.length) {
    const ch = chars[i]!

    if (isCJK(ch)) {
      tokens.push(ch)
      i++
    } else if (ch === ' ' || ch === '\t') {
      // Collect space/tab run
      let spaces = ''
      while (i < chars.length && (chars[i] === ' ' || chars[i] === '\t')) {
        spaces += chars[i]
        i++
      }
      tokens.push(spaces)
    } else {
      // Collect Latin word (non-space, non-tab, non-CJK run)
      let word = ''
      while (i < chars.length && chars[i] !== ' ' && chars[i] !== '\t' && !isCJK(chars[i]!)) {
        word += chars[i]
        i++
      }
      tokens.push(word)
    }
  }

  return tokens
}

/**
 * Break a token into pieces that each fit within maxWidth.
 */
function charBreak(
  token: string,
  maxWidth: number,
  measureWidth: MeasureWidthFn,
): WrappedLine[] {
  const chars = graphemes(token)
  const pieces: WrappedLine[] = []
  let current = ''

  for (const ch of chars) {
    const trial = current + ch
    if (measureWidth(trial) > maxWidth && current.length > 0) {
      pieces.push({ text: current, width: measureWidth(current) })
      current = ch
    } else {
      current = trial
    }
  }

  if (current.length > 0) {
    pieces.push({ text: current, width: measureWidth(current) })
  }

  return pieces
}

/**
 * Apply kinsoku (line-break prohibition) rules by merging tokens.
 * - No-start chars (。，etc.) are merged with the preceding token
 * - No-end chars (「（etc.) are merged with the following token
 */
function applyKinsoku(tokens: string[]): string[] {
  if (tokens.length <= 1) return tokens

  const result: string[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    const chars = graphemes(token)

    // If this single-grapheme token is a no-start char, merge with previous token
    // Note: kinsoku chars (。，（ etc.) are single-code-point graphemes, so Set.has() still works
    if (chars.length === 1 && isNoStartChar(chars[0]!) && result.length > 0) {
      result[result.length - 1] = result[result.length - 1]! + token
      continue
    }

    // If previous token is a single no-end char, it was already pushed.
    // Check if current token should be merged with it.
    if (result.length > 0) {
      const prevChars = graphemes(result[result.length - 1]!)
      const lastPrevChar = prevChars[prevChars.length - 1]
      if (lastPrevChar && isNoEndChar(lastPrevChar) && prevChars.length === 1) {
        result[result.length - 1] = result[result.length - 1]! + token
        continue
      }
    }

    result.push(token)
  }

  return result
}

function trimEnd(s: string): string {
  return s.replace(/\s+$/, '')
}

