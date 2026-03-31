import { segmentize, type Segment } from './segment.js'
import { resolveMaxLines } from './utils.js'
import type {
  MeasureSpanWidthFn,
  GetSpanMetricsFn,
  WrapRichTextSpan,
  WrapRichTextOptions,
  WrapRichTextResult,
  WrapRichLine,
  WrapFragment,
  SpanMetrics,
} from '../types.js'

export function wrapRichText(
  spans: WrapRichTextSpan[],
  maxWidth: number,
  measureWidth: MeasureSpanWidthFn,
  getMetrics: GetSpanMetricsFn,
  options: WrapRichTextOptions,
): WrapRichTextResult {
  const { lineHeight, maxLines, maxHeight } = options
  const effectiveMaxLines = resolveMaxLines(lineHeight, maxLines, maxHeight)

  const segments = segmentize(spans)

  if (segments.length === 0) {
    return {
      lines: [],
      lineCount: 0,
      totalLineCount: 0,
      truncated: false,
      height: 0,
      maxLineWidth: 0,
    }
  }

  // Build all lines from segments
  const rawLines = buildLines(segments, maxWidth, measureWidth)

  // Calculate total before truncation
  const totalLineCount = rawLines.length

  // Apply truncation
  const visibleCount = effectiveMaxLines !== undefined
    ? Math.min(rawLines.length, effectiveMaxLines)
    : rawLines.length
  const truncated = visibleCount < totalLineCount

  // Build final lines with metrics
  const lines: WrapRichLine[] = []
  let y = 0

  for (let i = 0; i < visibleCount; i++) {
    const raw = rawLines[i]!
    const fragments = mergeFragments(raw.fragments, measureWidth)
    const metrics = computeLineMetrics(fragments, spans, getMetrics)

    lines.push({
      fragments,
      width: computeLineWidth(fragments),
      ascent: metrics.ascent,
      descent: metrics.descent,
      height: lineHeight,
      y,
      baseline: y + metrics.ascent,
    })

    y += lineHeight
  }

  return {
    lines,
    lineCount: visibleCount,
    totalLineCount,
    truncated,
    height: visibleCount * lineHeight,
    maxLineWidth: lines.reduce((max, l) => l.width > max ? l.width : max, 0),
  }
}

// ---------------------------------------------------------------------------
// Line building from segments
// ---------------------------------------------------------------------------

interface RawFragment {
  spanIndex: number
  text: string
  style: Segment['style']
}

interface RawLine {
  fragments: RawFragment[]
}

function buildLines(
  segments: Segment[],
  maxWidth: number,
  measureWidth: MeasureSpanWidthFn,
): RawLine[] {
  const lines: RawLine[] = []
  let currentFragments: RawFragment[] = []
  let currentWidth = 0

  // Track segments that form an unbreakable word group
  let wordGroup: Segment[] = []
  let wordGroupWidth = 0

  function flushWordGroup(): void {
    if (wordGroup.length === 0) return

    const groupWidth = wordGroupWidth

    if (currentWidth + groupWidth <= maxWidth) {
      // Fits on current line
      for (const seg of wordGroup) {
        currentFragments.push({ spanIndex: seg.spanIndex, text: seg.text, style: seg.style })
        currentWidth += measureWidth(seg.text, seg.style)
      }
    } else {
      // Doesn't fit — flush current line and start new one
      if (currentFragments.length > 0) {
        lines.push({ fragments: trimTrailingSpaces(currentFragments) })
      }
      currentFragments = []
      currentWidth = 0

      // If group itself exceeds maxWidth, character-break it
      if (groupWidth > maxWidth) {
        for (const seg of wordGroup) {
          const chars = [...seg.text]
          let acc = '' // accumulated chars for current fragment
          for (const ch of chars) {
            const trial = acc + ch
            const trialWidth = measureWidth(trial, seg.style)
            if (currentWidth + trialWidth > maxWidth && (currentFragments.length > 0 || acc.length > 0)) {
              if (acc.length > 0) {
                currentFragments.push({ spanIndex: seg.spanIndex, text: acc, style: seg.style })
                currentWidth += measureWidth(acc, seg.style)
              }
              lines.push({ fragments: trimTrailingSpaces(currentFragments) })
              currentFragments = []
              currentWidth = 0
              acc = ch
            } else {
              acc = trial
            }
          }
          if (acc.length > 0) {
            currentFragments.push({ spanIndex: seg.spanIndex, text: acc, style: seg.style })
            currentWidth += measureWidth(acc, seg.style)
          }
        }
      } else {
        for (const seg of wordGroup) {
          currentFragments.push({ spanIndex: seg.spanIndex, text: seg.text, style: seg.style })
          currentWidth += measureWidth(seg.text, seg.style)
        }
      }
    }

    wordGroup = []
    wordGroupWidth = 0
  }

  for (const seg of segments) {
    if (seg.kind === 'newline') {
      flushWordGroup()
      lines.push({ fragments: trimTrailingSpaces(currentFragments) })
      currentFragments = []
      currentWidth = 0
      continue
    }

    if (seg.kind === 'space') {
      // Space is a break opportunity — flush word group first
      flushWordGroup()

      const spaceWidth = measureWidth(seg.text, seg.style)
      if (currentWidth + spaceWidth <= maxWidth) {
        currentFragments.push({ spanIndex: seg.spanIndex, text: seg.text, style: seg.style })
        currentWidth += spaceWidth
      } else {
        // Space doesn't fit — flush line, don't carry space to next line
        if (currentFragments.length > 0) {
          lines.push({ fragments: trimTrailingSpaces(currentFragments) })
        }
        currentFragments = []
        currentWidth = 0
      }
      continue
    }

    // kind === 'text': accumulate into word group
    wordGroup.push(seg)
    wordGroupWidth += measureWidth(seg.text, seg.style)
  }

  // Flush remaining
  flushWordGroup()
  if (currentFragments.length > 0) {
    lines.push({ fragments: trimTrailingSpaces(currentFragments) })
  }

  // If last segment was a newline, add trailing empty line
  if (segments.length > 0 && segments[segments.length - 1]!.kind === 'newline') {
    lines.push({ fragments: [] })
  }

  return lines
}

// ---------------------------------------------------------------------------
// Fragment merging: combine adjacent fragments from same span
// ---------------------------------------------------------------------------

function mergeFragments(
  rawFragments: RawFragment[],
  measureWidth: MeasureSpanWidthFn,
): WrapFragment[] {
  if (rawFragments.length === 0) return []

  const merged: WrapFragment[] = []
  let current = rawFragments[0]!
  let accText = current.text

  for (let i = 1; i < rawFragments.length; i++) {
    const next = rawFragments[i]!
    if (next.spanIndex === current.spanIndex) {
      accText += next.text
    } else {
      merged.push({
        spanIndex: current.spanIndex,
        text: accText,
        x: 0, // computed below
        width: measureWidth(accText, current.style),
      })
      current = next
      accText = next.text
    }
  }

  // Flush last
  merged.push({
    spanIndex: current.spanIndex,
    text: accText,
    x: 0,
    width: measureWidth(accText, current.style),
  })

  // Compute x offsets
  let x = 0
  for (const frag of merged) {
    frag.x = x
    x += frag.width
  }

  return merged
}

// ---------------------------------------------------------------------------
// Line metrics
// ---------------------------------------------------------------------------

function computeLineMetrics(
  fragments: WrapFragment[],
  spans: WrapRichTextSpan[],
  getMetrics: GetSpanMetricsFn,
): SpanMetrics {
  let maxAscent = 0
  let maxDescent = 0

  // Track which styles we've seen to avoid redundant calls
  const seen = new Set<number>()

  for (const frag of fragments) {
    if (seen.has(frag.spanIndex)) continue
    seen.add(frag.spanIndex)

    const span = spans[frag.spanIndex]
    if (!span) continue

    const metrics = getMetrics(span.style)
    if (metrics.ascent > maxAscent) maxAscent = metrics.ascent
    if (metrics.descent > maxDescent) maxDescent = metrics.descent
  }

  return { ascent: maxAscent, descent: maxDescent }
}

function computeLineWidth(fragments: WrapFragment[]): number {
  if (fragments.length === 0) return 0
  const last = fragments[fragments.length - 1]!
  return last.x + last.width
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trimTrailingSpaces(fragments: RawFragment[]): RawFragment[] {
  const result = [...fragments]

  while (result.length > 0) {
    const last = result[result.length - 1]!
    const trimmed = last.text.replace(/\s+$/, '')
    if (trimmed === '') {
      result.pop()
      continue
    }
    if (trimmed !== last.text) {
      result[result.length - 1] = { ...last, text: trimmed }
    }
    break
  }

  return result
}

