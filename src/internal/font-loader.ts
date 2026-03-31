import opentype from 'opentype.js'
import { FontLoadError } from './errors.js'

/**
 * Load a font from a local file path.
 */
export async function loadFontFromPath(path: string): Promise<opentype.Font> {
  let buffer: Buffer
  try {
    const { readFile } = await import('fs/promises')
    buffer = await readFile(path)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new FontLoadError(
      `Failed to load font from path "${path}": ${msg}`
    )
  }

  try {
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    )
    return opentype.parse(arrayBuffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new FontLoadError(
      `Failed to parse font file "${path}": ${msg}`
    )
  }
}

/**
 * Load a font from in-memory binary data.
 */
export function loadFontFromData(data: ArrayBuffer | Uint8Array): opentype.Font {
  const arrayBuffer = data instanceof Uint8Array
    ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    : data

  try {
    return opentype.parse(arrayBuffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new FontLoadError(
      `Failed to parse font data: ${msg}`
    )
  }
}
