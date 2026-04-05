import { describe, it, expect } from 'vitest'
import { graphemes, graphemeCount } from '../../src/internal/grapheme.js'

describe('graphemes()', () => {
  it('splits ASCII text by character', () => {
    expect(graphemes('Hello')).toEqual(['H', 'e', 'l', 'l', 'o'])
  })

  it('keeps simple emoji as single grapheme', () => {
    expect(graphemes('👋')).toEqual(['👋'])
  })

  it('keeps skin-tone emoji as single grapheme', () => {
    expect(graphemes('👋🏽')).toEqual(['👋🏽'])
    expect(graphemeCount('👋🏽')).toBe(1)
  })

  it('keeps family emoji (ZWJ sequence) as single grapheme', () => {
    const family = '👨‍👩‍👧‍👦'
    expect(graphemes(family)).toEqual([family])
    expect(graphemeCount(family)).toBe(1)
  })

  it('keeps flag emoji as single grapheme', () => {
    expect(graphemes('🇯🇵')).toEqual(['🇯🇵'])
    expect(graphemeCount('🇯🇵')).toBe(1)
  })

  it('keeps combining character as single grapheme', () => {
    const eAccent = 'e\u0301'
    expect(graphemes(eAccent)).toEqual([eAccent])
    expect(graphemeCount(eAccent)).toBe(1)
  })

  it('correctly counts mixed text', () => {
    expect(graphemeCount('Hello 👋🏽!')).toBe(8)
  })

  it('handles CJK characters', () => {
    expect(graphemes('你好')).toEqual(['你', '好'])
    expect(graphemeCount('你好')).toBe(2)
  })

  it('handles empty string', () => {
    expect(graphemes('')).toEqual([])
    expect(graphemeCount('')).toBe(0)
  })

  it('handles Thai combining vowels and tone marks', () => {
    const thai = 'สวัสดี'
    expect(graphemeCount(thai)).toBe(4)
  })

  it('handles Devanagari conjuncts', () => {
    // न, म, स्ते = 3 grapheme clusters (स्ते is a conjunct)
    const hindi = 'नमस्ते'
    expect(graphemeCount(hindi)).toBe(3)
  })

  it('handles Arabic with diacritics', () => {
    const arabic = 'بِسْمِ'
    expect(graphemeCount(arabic)).toBeLessThan(arabic.length)
  })

  it('handles back-to-back flag sequences', () => {
    expect(graphemes('🇯🇵🇺🇸')).toEqual(['🇯🇵', '🇺🇸'])
    expect(graphemeCount('🇯🇵🇺🇸')).toBe(2)
  })
})
