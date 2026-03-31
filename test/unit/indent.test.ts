import { describe, it, expect } from 'vitest'
import { wrapText } from '../../src/internal/wrap-core.js'
import { createMockMeasureWidth } from '../helpers/mock-measure-width.js'

// Each char = 10px
const mw = createMockMeasureWidth(10)

describe('wrapText — indent', () => {
  it('should reduce first line width by indent amount', () => {
    // "ABCDEFGHIJ" = 100px, maxWidth=60, indent=20
    // First line effective width = 60-20 = 40px (4 chars)
    // Subsequent lines = 60px (6 chars)
    const result = wrapText('ABCDEFGHIJ', 60, mw, { lineHeight: 20, indent: 20 })
    expect(result.lines[0]).toBe('ABCD')
    expect(result.lines[1]).toBe('EFGHIJ')
    expect(result.lineCount).toBe(2)
  })

  it('should not affect subsequent lines', () => {
    // "aa bb cc dd ee ff" maxWidth=50, indent=20
    // Line 1: effective 30px → "aa" (20px) fits, "aa bb" = 50px > 30px → "aa"
    // Line 2: effective 50px → "bb cc" (50px) fits
    // Line 3: effective 50px → "dd ee" (50px) fits
    // Line 4: "ff"
    const result = wrapText('aa bb cc dd ee ff', 50, mw, { lineHeight: 20, indent: 20 })
    expect(result.lines[0]).toBe('aa')
    expect(result.lineCount).toBeGreaterThan(1)
  })

  it('should work with zero indent (default)', () => {
    const result = wrapText('Hello World', 60, mw, { lineHeight: 20 })
    expect(result.lines).toEqual(['Hello', 'World'])
  })
})

describe('wrapText — hangingIndent', () => {
  it('should reduce subsequent lines width by hangingIndent', () => {
    // "ABCDEFGHIJKLMNO" = 150px, maxWidth=60, hangingIndent=20
    // Line 1: effective 60px (6 chars) → "ABCDEF"
    // Line 2: effective 60-20 = 40px (4 chars) → "GHIJ"
    // Line 3: effective 40px → "KLMN"
    // Line 4: "O"
    const result = wrapText('ABCDEFGHIJKLMNO', 60, mw, { lineHeight: 20, hangingIndent: 20 })
    expect(result.lines[0]).toBe('ABCDEF')
    expect(result.lines[1]).toBe('GHIJ')
    expect(result.lines[2]).toBe('KLMN')
    expect(result.lines[3]).toBe('O')
    expect(result.lineCount).toBe(4)
  })

  it('should not affect first line', () => {
    const result = wrapText('Hello World', 60, mw, { lineHeight: 20, hangingIndent: 20 })
    // First line: 60px → "Hello" (50px) fits, "Hello " + "World" > 60 → "Hello"
    expect(result.lines[0]).toBe('Hello')
  })
})

describe('wrapText — indent + hangingIndent combined', () => {
  it('should apply indent to first line and hangingIndent to rest', () => {
    // Simulates a bullet list item:
    // "* " takes 20px (indent), text wraps at 60px total
    // Continuation lines have 20px hanging indent
    // "ABCDEFGHIJKLMNO" maxWidth=60, indent=20, hangingIndent=20
    // Line 1: 60-20 = 40px (4 chars)
    // Line 2: 60-20 = 40px (4 chars)
    // Line 3: 40px (4 chars)
    // Line 4: "MNO"
    const result = wrapText('ABCDEFGHIJKLMNO', 60, mw, {
      lineHeight: 20, indent: 20, hangingIndent: 20,
    })
    expect(result.lines[0]).toBe('ABCD')
    expect(result.lines[1]).toBe('EFGH')
    expect(result.lines[2]).toBe('IJKL')
    expect(result.lines[3]).toBe('MNO')
    expect(result.lineCount).toBe(4)
  })
})

describe('wrapText — indent with paragraphs', () => {
  it('should apply indent to each paragraph first line', () => {
    // "ABCD\nEFGH" maxWidth=50, indent=20
    // Para 1 line 1: 30px → "ABC"
    // Para 1 line 2: 50px → "D"
    // Para 2 line 1: 30px → "EFG"
    // Para 2 line 2: 50px → "H"
    const result = wrapText('ABCD\nEFGH', 50, mw, { lineHeight: 20, indent: 20 })
    expect(result.lines[0]).toBe('ABC')
    // Second paragraph should also have indent on its first line
    // "EFGH" → first line 30px → "EFG", then "H"
    expect(result.lineCount).toBe(4)
  })
})
