import { describe, it, expect } from 'vitest'
import { LRUCache } from '../../src/internal/font-cache.js'

describe('LRUCache', () => {
  it('should set and get values', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('should return undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(10)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('should evict least recently used when capacity exceeded', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4) // should evict 'a'
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('d')).toBe(4)
  })

  it('should refresh access time on get', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.get('a') // refresh 'a'
    cache.set('d', 4) // should evict 'b' (not 'a')
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
  })

  it('should refresh access time on set of existing key', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('a', 10) // refresh 'a' with new value
    cache.set('d', 4) // should evict 'b'
    expect(cache.get('a')).toBe(10)
    expect(cache.get('b')).toBeUndefined()
  })

  it('should support has()', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })

  it('should support clear()', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('should report correct size', () => {
    const cache = new LRUCache<string, number>(10)
    expect(cache.size).toBe(0)
    cache.set('a', 1)
    expect(cache.size).toBe(1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
    cache.set('a', 10) // overwrite, same size
    expect(cache.size).toBe(2)
  })

  it('should handle capacity of 1', () => {
    const cache = new LRUCache<string, number>(1)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.size).toBe(1)
  })
})
