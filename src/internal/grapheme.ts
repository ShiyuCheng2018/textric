// Lazy-initialized to avoid import-time crash in environments without Intl.Segmenter
let segmenter: Intl.Segmenter | null = null
function getSegmenter(): Intl.Segmenter {
  return segmenter ??= new Intl.Segmenter('en', { granularity: 'grapheme' })
}

/** Split text into grapheme clusters (handles emoji, combining marks, ZWJ sequences). */
export function graphemes(text: string): string[] {
  return [...getSegmenter().segment(text)].map(s => s.segment)
}

/** Count grapheme clusters in text. */
export function graphemeCount(text: string): number {
  let count = 0
  for (const _ of getSegmenter().segment(text)) count++
  return count
}
