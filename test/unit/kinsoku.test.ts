import { describe, it, expect } from 'vitest'
import { wrapText } from '../../src/internal/wrap-core.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'

// Each char = 10px
const mw = createMockMeasureWidth(10)

describe('CJK kinsoku (line-break prohibition)', () => {
  describe('no-start characters (行首禁止)', () => {
    it('should not place closing punctuation at line start', () => {
      // "你好世界。测试" = 7 chars, maxWidth=50 (5 chars)
      // Without kinsoku: "你好世界。" / "测试" — "。" ends line 1, OK
      // But if maxWidth=40 (4 chars): "你好世界" / "。测试" — "。" at line start, BAD
      // With kinsoku: "你好世" / "界。测试" — "。" stays with preceding char
      const result = wrapText('你好世界。测试', 40, mw, { lineHeight: 20 })
      // "。" should NOT appear at the start of any line
      for (let i = 1; i < result.lines.length; i++) {
        const line = result.lines[i]!
        expect('。，、；：？！）】」』》〉'.includes(line[0]!)).toBe(false)
      }
    })

    it('should not place comma at line start', () => {
      // "测试文本，继续" = 7 chars, maxWidth=40 (4 chars)
      const result = wrapText('测试文本，继续', 40, mw, { lineHeight: 20 })
      for (let i = 1; i < result.lines.length; i++) {
        const line = result.lines[i]!
        expect('。，、；：？！）】」』》〉'.includes(line[0]!)).toBe(false)
      }
    })

    it('should not place question mark at line start', () => {
      const result = wrapText('你好吗？回答', 40, mw, { lineHeight: 20 })
      for (let i = 1; i < result.lines.length; i++) {
        const line = result.lines[i]!
        expect('。，、；：？！）】」』》〉'.includes(line[0]!)).toBe(false)
      }
    })
  })

  describe('no-end characters (行尾禁止)', () => {
    it('should not place opening bracket at line end', () => {
      // "前文「引用」后文" = 8 chars, maxWidth=40 (4 chars)
      const result = wrapText('前文「引用」后文', 40, mw, { lineHeight: 20 })
      // "「" should NOT appear at the end of any line (except last)
      for (let i = 0; i < result.lines.length - 1; i++) {
        const line = result.lines[i]!
        const lastChar = [...line].at(-1)
        if (lastChar) {
          expect('（【「『《〈'.includes(lastChar)).toBe(false)
        }
      }
    })
  })

  describe('normal CJK wrapping still works', () => {
    it('should still break at character boundaries for normal CJK', () => {
      const result = wrapText('你好世界测试文本', 40, mw, { lineHeight: 20 })
      expect(result.lineCount).toBe(2)
      expect(result.lines[0]).toBe('你好世界')
      expect(result.lines[1]).toBe('测试文本')
    })

    it('should handle Latin + CJK mixed text with kinsoku', () => {
      // "Hello你好。World" — "。" shouldn't start a new line
      const result = wrapText('Hello你好。World', 70, mw, { lineHeight: 20 })
      for (let i = 1; i < result.lines.length; i++) {
        const line = result.lines[i]!
        expect('。，'.includes(line[0]!)).toBe(false)
      }
    })
  })
})
