/**
 * O(1) LRU cache using Map's insertion order + move-to-end on access.
 */
export class LRUCache<K, V> {
  private readonly map = new Map<K, V>()
  private readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined

    // Move to end (most recently used)
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.capacity) {
      // Evict oldest (first entry)
      const oldest = this.map.keys().next().value as K
      this.map.delete(oldest)
    }
    this.map.set(key, value)
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }

  firstValue(): V | undefined {
    const first = this.map.values().next()
    return first.done ? undefined : first.value
  }
}
