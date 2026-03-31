import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import opentype from 'opentype.js'
import { FontRegistry } from '../../src/internal/font-registry.js'

const font = opentype.loadSync(resolve('test/fixtures/fonts/Inter-Regular.ttf'))
const boldFont = opentype.loadSync(resolve('test/fixtures/fonts/Inter-Bold.ttf'))

describe('FontRegistry', () => {
  describe('register + resolve', () => {
    it('should resolve an exact match', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      const result = reg.resolve('Inter', 400, 'normal')
      expect(result).toBe(font)
    })

    it('should return null for unregistered font family', () => {
      const reg = new FontRegistry()
      expect(reg.resolve('Unknown', 400, 'normal')).toBeNull()
    })

    it('should return null for unregistered weight', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      // No fallback for this test — use resolveWithFallback for fallback
      expect(reg.resolve('Inter', 700, 'normal')).toBeNull()
    })
  })

  describe('resolveWithFallback', () => {
    it('should return exact match when available', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      reg.register('Inter', 700, 'normal', boldFont)
      const result = reg.resolveWithFallback('Inter', 700, 'normal')
      expect(result?.font).toBe(boldFont)
      expect(result?.exact).toBe(true)
    })

    it('should fallback to closest weight', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      // Request 700, only 400 available
      const result = reg.resolveWithFallback('Inter', 700, 'normal')
      expect(result?.font).toBe(font)
      expect(result?.exact).toBe(false)
    })

    it('should prefer closest weight in same family', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      reg.register('Inter', 700, 'normal', boldFont)
      // Request 600 → 700 is closer than 400
      const result = reg.resolveWithFallback('Inter', 600, 'normal')
      expect(result?.font).toBe(boldFont)
    })

    it('should fallback normal style when italic not available', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      const result = reg.resolveWithFallback('Inter', 400, 'italic')
      expect(result?.font).toBe(font)
      expect(result?.exact).toBe(false)
    })

    it('should return null for completely unknown family', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      expect(reg.resolveWithFallback('Unknown', 400, 'normal')).toBeNull()
    })
  })

  describe('getInfo', () => {
    it('should return registered weights and styles', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      reg.register('Inter', 700, 'normal', boldFont)
      const info = reg.getInfo('Inter')
      expect(info).not.toBeNull()
      expect(info!.weights).toContain(400)
      expect(info!.weights).toContain(700)
      expect(info!.styles).toContain('normal')
    })

    it('should return null for unknown family', () => {
      const reg = new FontRegistry()
      expect(reg.getInfo('Unknown')).toBeNull()
    })
  })

  describe('has', () => {
    it('should return true for registered font', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      expect(reg.has('Inter', 400, 'normal')).toBe(true)
    })

    it('should return false for unregistered variant', () => {
      const reg = new FontRegistry()
      reg.register('Inter', 400, 'normal', font)
      expect(reg.has('Inter', 700, 'normal')).toBe(false)
      expect(reg.has('Inter', 400, 'italic')).toBe(false)
      expect(reg.has('Unknown', 400, 'normal')).toBe(false)
    })
  })
})
