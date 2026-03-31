import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { loadFontFromPath, loadFontFromData } from '../../src/internal/font-loader.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')

describe('loadFontFromPath', () => {
  it('should load a font from a valid .ttf path', async () => {
    const font = await loadFontFromPath(REGULAR_PATH)
    expect(font).toBeDefined()
    expect(font.unitsPerEm).toBe(2048)
  })

  it('should load bold font variant', async () => {
    const font = await loadFontFromPath(BOLD_PATH)
    expect(font).toBeDefined()
    expect(font.names.fontFamily.en).toBe('Inter')
  })

  it('should throw FontLoadError for non-existent path', async () => {
    await expect(loadFontFromPath('/nonexistent/font.ttf'))
      .rejects
      .toThrow('Failed to load font from path')
  })

  it('should include the path in error message', async () => {
    const badPath = '/nonexistent/missing-font.ttf'
    await expect(loadFontFromPath(badPath))
      .rejects
      .toThrow(badPath)
  })
})

describe('loadFontFromData', () => {
  it('should load a font from ArrayBuffer', () => {
    const buffer = readFileSync(REGULAR_PATH)
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    const font = loadFontFromData(arrayBuffer)
    expect(font).toBeDefined()
    expect(font.unitsPerEm).toBe(2048)
  })

  it('should load a font from Uint8Array', () => {
    const buffer = readFileSync(REGULAR_PATH)
    const uint8 = new Uint8Array(buffer)
    const font = loadFontFromData(uint8)
    expect(font).toBeDefined()
    expect(font.names.fontFamily.en).toBe('Inter')
  })

  it('should throw FontLoadError for invalid data', () => {
    const garbage = new ArrayBuffer(100)
    expect(() => loadFontFromData(garbage)).toThrow('Failed to parse font data')
  })
})
