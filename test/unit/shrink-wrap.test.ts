import { describe, it, expect } from 'vitest'
import { shrinkWrap } from '../../src/internal/shrink-wrap.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'

// Each char = 10px
const mw = createMockMeasureWidth(10)

describe('shrinkWrap', () => {
  it('should return full text width for maxLines=1', () => {
    const result = shrinkWrap('Hello World', mw, { lineHeight: 20, maxLines: 1 })
    expect(result.width).toBe(110) // 11 chars * 10px
  })

  it('should find narrowest width for maxLines=2', () => {
    // "Hello" (50px) on line 1, "World" (50px) on line 2
    const result = shrinkWrap('Hello World', mw, { lineHeight: 20, maxLines: 2 })
    expect(result.width).toBe(50)
    expect(result.lineCount).toBe(2)
    expect(result.height).toBe(40)
  })

  it('should find optimal width for more lines', () => {
    // "aa bb" / "cc dd" → each line 50px
    const result = shrinkWrap('aa bb cc dd', mw, { lineHeight: 20, maxLines: 2 })
    expect(result.width).toBe(50)
  })

  it('should character-break a single long word when maxLines allows', () => {
    // "HelloWorld" = 100px → char-break into "Hello" (50px) + "World" (50px)
    const result = shrinkWrap('HelloWorld', mw, { lineHeight: 20, maxLines: 2 })
    expect(result.width).toBe(50)
  })

  it('should return full width for single word with maxLines=1', () => {
    const result = shrinkWrap('HelloWorld', mw, { lineHeight: 20, maxLines: 1 })
    expect(result.width).toBe(100)
  })

  it('should handle empty text', () => {
    const result = shrinkWrap('', mw, { lineHeight: 20, maxLines: 1 })
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('should return complete result with lines array', () => {
    const result = shrinkWrap('Hello World', mw, { lineHeight: 20, maxLines: 2 })
    expect(result.lines).toEqual(['Hello', 'World'])
    expect(result.lineCount).toBe(2)
    expect(result.height).toBe(40)
  })
})
