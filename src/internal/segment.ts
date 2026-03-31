import { isCJK } from './cjk.js'
import type { SpanStyle } from '../types.js'

export interface Segment {
  text: string
  spanIndex: number
  style: SpanStyle
  kind: 'text' | 'space' | 'newline'
}

export interface SegmentInput {
  text: string
  style: SpanStyle
}

/**
 * Split rich text spans into fine-grained segments for wrapping.
 *
 * Rules:
 * - Each CJK character becomes its own 'text' segment
 * - Latin words (non-space, non-CJK, non-newline runs) become 'text' segments
 * - Space runs become 'space' segments
 * - Each '\n' becomes a 'newline' segment
 * - Span boundaries always create segment boundaries
 * - Empty spans are skipped
 */
export function segmentize(spans: SegmentInput[]): Segment[] {
  const result: Segment[] = []

  for (let spanIndex = 0; spanIndex < spans.length; spanIndex++) {
    const span = spans[spanIndex]!
    if (span.text === '') continue

    // Normalize line endings
    const normalized = span.text.replace(/\r\n?/g, '\n')
    const chars = [...normalized]
    let i = 0

    while (i < chars.length) {
      const ch = chars[i]!

      if (ch === '\n') {
        result.push({ text: '\n', spanIndex, style: span.style, kind: 'newline' })
        i++
      } else if (ch === ' ' || ch === '\t') {
        let spaces = ''
        while (i < chars.length && (chars[i] === ' ' || chars[i] === '\t')) {
          spaces += chars[i]
          i++
        }
        result.push({ text: spaces, spanIndex, style: span.style, kind: 'space' })
      } else if (isCJK(ch)) {
        result.push({ text: ch, spanIndex, style: span.style, kind: 'text' })
        i++
      } else {
        let word = ''
        while (
          i < chars.length &&
          chars[i] !== ' ' &&
          chars[i] !== '\t' &&
          chars[i] !== '\n' &&
          !isCJK(chars[i]!)
        ) {
          word += chars[i]
          i++
        }
        result.push({ text: word, spanIndex, style: span.style, kind: 'text' })
      }
    }
  }

  return result
}
