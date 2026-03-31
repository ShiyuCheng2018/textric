import { describe, it, expect } from 'vitest'
import { resolveMaxLines } from '../../src/internal/utils.js'

describe('resolveMaxLines', () => {
  it('should return undefined when both maxLines and maxHeight are undefined', () => {
    expect(resolveMaxLines(20, undefined, undefined)).toBeUndefined()
  })

  it('should return maxLines when only maxLines is set', () => {
    expect(resolveMaxLines(20, 3, undefined)).toBe(3)
  })

  it('should floor maxHeight / lineHeight', () => {
    expect(resolveMaxLines(20, undefined, 50)).toBe(2) // 50/20=2.5 → floor=2
  })

  it('should return min of maxLines and maxHeight-derived lines', () => {
    expect(resolveMaxLines(20, 5, 60)).toBe(3) // 60/20=3, min(5,3)=3
  })

  it('should return 0 when maxHeight is less than lineHeight', () => {
    expect(resolveMaxLines(20, undefined, 10)).toBe(0)
  })

  it('should prefer maxLines when it is stricter', () => {
    expect(resolveMaxLines(20, 1, 100)).toBe(1) // 100/20=5, min(1,5)=1
  })
})
