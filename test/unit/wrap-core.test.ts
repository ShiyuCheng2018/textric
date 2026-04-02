import { describe, it, expect } from 'vitest'
import { wrapText } from '../../src/internal/wrap-core.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'
import type { MeasureWidthFn } from '../../src/types.js'

// Default mock: every character = 10px wide
const mw = createMockMeasureWidth(10)

describe('wrapText', () => {
  describe('empty and trivial input', () => {
    it('should handle empty string', () => {
      const result = wrapText('', 100, mw, { lineHeight: 20 })
      expect(result.lines).toEqual([''])
      expect(result.lineCount).toBe(1)
      expect(result.totalLineCount).toBe(1)
      expect(result.truncated).toBe(false)
      expect(result.height).toBe(20)
      expect(result.maxLineWidth).toBe(0)
    })

    it('should handle single character that fits', () => {
      const result = wrapText('A', 100, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['A'])
      expect(result.lineCount).toBe(1)
      expect(result.maxLineWidth).toBe(10)
    })
  })

  describe('single-line (no wrap needed)', () => {
    it('should not wrap when text fits within maxWidth', () => {
      const result = wrapText('Hello', 100, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['Hello'])
      expect(result.lineCount).toBe(1)
      expect(result.maxLineWidth).toBe(50) // 5 chars * 10px
    })

    it('should not wrap when text exactly equals maxWidth', () => {
      const result = wrapText('HelloWorld', 100, mw, { lineHeight: 20 })
      // 10 chars * 10px = 100px = maxWidth exactly
      expect(result.lines).toEqual(['HelloWorld'])
      expect(result.lineCount).toBe(1)
    })
  })

  describe('Latin word-boundary wrapping', () => {
    it('should wrap at space boundaries', () => {
      // "Hello World" = 11 chars, maxWidth = 60
      // "Hello" = 50px fits, " World" pushes to 110px
      const result = wrapText('Hello World', 60, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['Hello', 'World'])
      expect(result.lineCount).toBe(2)
    })

    it('should wrap multiple words correctly', () => {
      // "aa bb cc dd" with maxWidth=60 (6 chars)
      // "aa bb" = 50px fits, "cc dd" on next line
      const result = wrapText('aa bb cc dd', 60, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['aa bb', 'cc dd'])
    })

    it('should handle multiple consecutive spaces', () => {
      const result = wrapText('Hello   World', 60, mw, { lineHeight: 20 })
      // "Hello" fits (50px), "   World" starts on same line but 130px total, wraps
      expect(result.lines[0]).toBe('Hello')
      expect(result.lines.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('long word character-level wrapping', () => {
    it('should break a single long word by character', () => {
      // "ABCDEFGHIJ" = 100px, maxWidth = 30 (3 chars per line)
      const result = wrapText('ABCDEFGHIJ', 30, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['ABC', 'DEF', 'GHI', 'J'])
      expect(result.lineCount).toBe(4)
    })

    it('should break long word after fitting words', () => {
      // "Hi ABCDEFGH" maxWidth=50 (5 chars)
      // "Hi" fits (20px), "ABCDEFGH" too long — character break
      const result = wrapText('Hi ABCDEFGH', 50, mw, { lineHeight: 20 })
      expect(result.lines[0]).toBe('Hi')
      expect(result.lines[1]).toBe('ABCDE')
      expect(result.lines[2]).toBe('FGH')
    })
  })

  describe('CJK character-level wrapping', () => {
    it('should wrap CJK text at character boundaries', () => {
      // 6 CJK chars, maxWidth = 30 (3 chars per line)
      const result = wrapText('你好世界测试', 30, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['你好世', '界测试'])
    })

    it('should handle mixed Latin and CJK', () => {
      // "Hi你好" = 4 chars, maxWidth = 30 (3 chars)
      const result = wrapText('Hi你好', 30, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['Hi你', '好'])
    })
  })

  describe('explicit newlines', () => {
    it('should break on \\n', () => {
      const result = wrapText('Line1\nLine2', 200, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['Line1', 'Line2'])
      expect(result.lineCount).toBe(2)
    })

    it('should handle consecutive \\n producing empty lines', () => {
      const result = wrapText('A\n\nB', 200, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['A', '', 'B'])
      expect(result.lineCount).toBe(3)
    })

    it('should handle trailing newline', () => {
      const result = wrapText('Hello\n', 200, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['Hello', ''])
      expect(result.lineCount).toBe(2)
    })

    it('should wrap within paragraphs separated by \\n', () => {
      // "ABCDEF\nGHI" maxWidth=30 (3 chars)
      const result = wrapText('ABCDEF\nGHI', 30, mw, { lineHeight: 20 })
      expect(result.lines).toEqual(['ABC', 'DEF', 'GHI'])
      expect(result.lineCount).toBe(3)
    })
  })

  describe('truncation with maxLines', () => {
    it('should truncate to maxLines', () => {
      // 5 lines needed, maxLines=2
      const result = wrapText('A\nB\nC\nD\nE', 200, mw, { lineHeight: 20, maxLines: 2 })
      expect(result.lines).toEqual(['A', 'B'])
      expect(result.lineCount).toBe(2)
      expect(result.totalLineCount).toBe(5)
      expect(result.truncated).toBe(true)
    })

    it('should not truncate when lines fit within maxLines', () => {
      const result = wrapText('A\nB', 200, mw, { lineHeight: 20, maxLines: 5 })
      expect(result.truncated).toBe(false)
      expect(result.lineCount).toBe(2)
      expect(result.totalLineCount).toBe(2)
    })
  })

  describe('truncation with maxHeight', () => {
    it('should truncate based on maxHeight', () => {
      // lineHeight=20, maxHeight=40 → 2 lines max
      const result = wrapText('A\nB\nC\nD', 200, mw, { lineHeight: 20, maxHeight: 40 })
      expect(result.lines).toEqual(['A', 'B'])
      expect(result.lineCount).toBe(2)
      expect(result.truncated).toBe(true)
      expect(result.totalLineCount).toBe(4)
    })

    it('should use the stricter of maxLines and maxHeight', () => {
      // maxLines=3, maxHeight=40 (2 lines) → maxHeight wins
      const result = wrapText('A\nB\nC\nD', 200, mw, {
        lineHeight: 20,
        maxLines: 3,
        maxHeight: 40,
      })
      expect(result.lineCount).toBe(2)
      expect(result.truncated).toBe(true)
    })
  })

  describe('height calculation', () => {
    it('should compute height as lineCount * lineHeight', () => {
      const result = wrapText('A\nB\nC', 200, mw, { lineHeight: 20 })
      expect(result.height).toBe(60) // 3 * 20
    })

    it('should compute height for wrapped lines', () => {
      // "ABCDEF" maxWidth=30 → 2 lines
      const result = wrapText('ABCDEF', 30, mw, { lineHeight: 15 })
      expect(result.height).toBe(30) // 2 * 15
    })
  })

  describe('maxLineWidth', () => {
    it('should report the width of the widest line', () => {
      // "Hello\nHi" → line1=50px, line2=20px → max=50
      const result = wrapText('Hello\nHi', 200, mw, { lineHeight: 20 })
      expect(result.maxLineWidth).toBe(50)
    })
  })

  describe('letterSpacing', () => {
    it('should account for letterSpacing in measurement', () => {
      // With letterSpacing, the measureWidth callback should be called
      // and the wrapping should use the width including spacing.
      // Use a custom measureWidth that adds letterSpacing
      const spacing = 2
      const mwSpaced: MeasureWidthFn = (text: string) =>
        text.length * 10 + Math.max(0, text.length - 1) * spacing

      // "Hello" = 5*10 + 4*2 = 58px, maxWidth=55 → wraps
      const result = wrapText('Hello World', 55, mwSpaced, {
        lineHeight: 20,
        letterSpacing: spacing,
      })
      expect(result.lineCount).toBeGreaterThanOrEqual(2)
    })
  })

  describe('invariant: all line widths <= maxWidth', () => {
    const texts = [
      'Hello World',
      'The quick brown fox jumps over the lazy dog',
      'A '.repeat(100),
      'Superlongwordwithoutanyspaces here',
      '你好世界测试文本排版',
      'Mixed 你好 English 世界 text',
      'Hello\nWorld\nThree lines',
    ]
    const widths = [20, 50, 80, 100, 200]

    for (const text of texts) {
      for (const maxWidth of widths) {
        it(`"${text.slice(0, 25)}..." at maxWidth=${maxWidth}`, () => {
          const result = wrapText(text, maxWidth, mw, { lineHeight: 20 })
          for (let i = 0; i < result.lines.length; i++) {
            const lineWidth = mw(result.lines[i]!)
            // Single char may exceed maxWidth (charBreak minimum progress)
            if (result.lines[i]!.length > 1) {
              expect(lineWidth).toBeLessThanOrEqual(maxWidth)
            }
          }
        })
      }
    }
  })
})
