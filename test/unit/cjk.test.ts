import { describe, it, expect } from 'vitest'
import { isCJK, hasCJK, getCJKChars } from '../../src/internal/cjk.js'

describe('isCJK', () => {
  it('should return true for CJK Unified Ideographs (Chinese)', () => {
    expect(isCJK('你')).toBe(true)
    expect(isCJK('好')).toBe(true)
    expect(isCJK('龍')).toBe(true)
  })

  it('should return true for Japanese Hiragana', () => {
    expect(isCJK('あ')).toBe(true)
    expect(isCJK('ん')).toBe(true)
  })

  it('should return true for Japanese Katakana', () => {
    expect(isCJK('ア')).toBe(true)
    expect(isCJK('ン')).toBe(true)
  })

  it('should return true for Korean Hangul', () => {
    expect(isCJK('한')).toBe(true)
    expect(isCJK('글')).toBe(true)
  })

  it('should return true for CJK Extension B characters', () => {
    expect(isCJK('𠀀')).toBe(true)
  })

  it('should return true for CJK fullwidth punctuation', () => {
    expect(isCJK('。')).toBe(true)
    expect(isCJK('、')).toBe(true)
    expect(isCJK('「')).toBe(true)
    expect(isCJK('」')).toBe(true)
  })

  it('should return false for ASCII characters', () => {
    expect(isCJK('A')).toBe(false)
    expect(isCJK('z')).toBe(false)
    expect(isCJK('0')).toBe(false)
    expect(isCJK(' ')).toBe(false)
  })

  it('should return false for Latin punctuation', () => {
    expect(isCJK('.')).toBe(false)
    expect(isCJK(',')).toBe(false)
    expect(isCJK('!')).toBe(false)
  })

  it('should return false for emoji', () => {
    expect(isCJK('😀')).toBe(false)
    expect(isCJK('👋')).toBe(false)
  })
})

describe('hasCJK', () => {
  it('should return true when text contains CJK characters', () => {
    expect(hasCJK('Hello 你好')).toBe(true)
    expect(hasCJK('テスト')).toBe(true)
  })

  it('should return false for pure Latin text', () => {
    expect(hasCJK('Hello World')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(hasCJK('')).toBe(false)
  })

  it('should return false for numbers and punctuation only', () => {
    expect(hasCJK('123 !@#')).toBe(false)
  })

  it('should return true for mixed Latin + CJK', () => {
    expect(hasCJK('React 入门教程')).toBe(true)
  })
})

describe('getCJKChars', () => {
  it('should extract CJK characters from mixed text', () => {
    expect(getCJKChars('Hello 你好世界 Test')).toBe('你好世界')
  })

  it('should return empty string for pure Latin text', () => {
    expect(getCJKChars('Hello World')).toBe('')
  })

  it('should return empty string for empty input', () => {
    expect(getCJKChars('')).toBe('')
  })

  it('should handle text with only CJK characters', () => {
    expect(getCJKChars('你好世界')).toBe('你好世界')
  })

  it('should deduplicate characters', () => {
    const result = getCJKChars('你好你好世界')
    expect(result).toBe('你好世界')
  })

  it('should include Japanese and Korean characters', () => {
    const result = getCJKChars('Hello あいう 한글')
    expect(result).toContain('あ')
    expect(result).toContain('한')
  })
})
