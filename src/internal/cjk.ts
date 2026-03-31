/**
 * Check if a single character is a CJK character.
 *
 * Covers:
 * - CJK Unified Ideographs (U+4E00–U+9FFF)
 * - CJK Unified Ideographs Extension A (U+3400–U+4DBF)
 * - CJK Unified Ideographs Extension B (U+20000–U+2A6DF)
 * - CJK Compatibility Ideographs (U+F900–U+FAFF)
 * - Hiragana (U+3040–U+309F)
 * - Katakana (U+30A0–U+30FF)
 * - Katakana Phonetic Extensions (U+31F0–U+31FF)
 * - Hangul Syllables (U+AC00–U+D7AF)
 * - Hangul Jamo (U+1100–U+11FF)
 * - CJK Symbols and Punctuation (U+3000–U+303F)
 * - Halfwidth and Fullwidth Forms (U+FF00–U+FFEF)
 * - CJK Radicals Supplement (U+2E80–U+2EFF)
 * - Kangxi Radicals (U+2F00–U+2FDF)
 * - Bopomofo (U+3100–U+312F)
 */
export function isCJK(char: string): boolean {
  const code = char.codePointAt(0)
  if (code === undefined) return false

  return (
    // CJK Unified Ideographs
    (code >= 0x4E00 && code <= 0x9FFF) ||
    // CJK Extension A
    (code >= 0x3400 && code <= 0x4DBF) ||
    // CJK Extension B
    (code >= 0x20000 && code <= 0x2A6DF) ||
    // CJK Compatibility Ideographs
    (code >= 0xF900 && code <= 0xFAFF) ||
    // Hiragana
    (code >= 0x3040 && code <= 0x309F) ||
    // Katakana
    (code >= 0x30A0 && code <= 0x30FF) ||
    // Katakana Phonetic Extensions
    (code >= 0x31F0 && code <= 0x31FF) ||
    // Hangul Syllables
    (code >= 0xAC00 && code <= 0xD7AF) ||
    // Hangul Jamo
    (code >= 0x1100 && code <= 0x11FF) ||
    // CJK Symbols and Punctuation
    (code >= 0x3000 && code <= 0x303F) ||
    // Halfwidth and Fullwidth Forms
    (code >= 0xFF00 && code <= 0xFFEF) ||
    // CJK Radicals Supplement
    (code >= 0x2E80 && code <= 0x2EFF) ||
    // Kangxi Radicals
    (code >= 0x2F00 && code <= 0x2FDF) ||
    // Bopomofo
    (code >= 0x3100 && code <= 0x312F)
  )
}

// Characters that must not appear at the start of a line (kinsoku)
const NO_START = new Set([
  '。', '，', '、', '；', '：', '？', '！',
  '）', '】', '」', '』', '》', '〉',
  ')', ']', '}',
  '.', ',', ';', ':', '?', '!',  // fullwidth variants handled by CJK range
  '…', '—', '～',
])

// Characters that must not appear at the end of a line (kinsoku)
const NO_END = new Set([
  '（', '【', '「', '『', '《', '〈',
  '(', '[', '{',
])

/**
 * Check if a character must not appear at the start of a line.
 */
export function isNoStartChar(char: string): boolean {
  return NO_START.has(char)
}

/**
 * Check if a character must not appear at the end of a line.
 */
export function isNoEndChar(char: string): boolean {
  return NO_END.has(char)
}

/**
 * Check if text contains any CJK characters.
 */
export function hasCJK(text: string): boolean {
  for (const char of text) {
    if (isCJK(char)) return true
  }
  return false
}

/**
 * Extract unique CJK characters from text, preserving first-occurrence order.
 */
export function getCJKChars(text: string): string {
  const seen = new Set<string>()
  let result = ''
  for (const char of text) {
    if (isCJK(char) && !seen.has(char)) {
      seen.add(char)
      result += char
    }
  }
  return result
}
