import { describe, it, expect } from 'vitest'
import { LRUCache } from '../../src/internal/font-cache.js'

describe('LRUCache.firstValue()', () => {
  it('should return the first (oldest) value', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.firstValue()).toBe(1)
  })

  it('should return undefined on empty cache', () => {
    const cache = new LRUCache<string, number>(10)
    expect(cache.firstValue()).toBeUndefined()
  })

  it('should reflect LRU order after access', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // move 'a' to end
    expect(cache.firstValue()).toBe(2) // 'b' is now oldest
  })
})
