import { describe, it, expect } from 'vitest'
import {
  TextricError,
  FontLoadError,
  FontNotFoundError,
  InvalidOptionsError,
} from '../../src/internal/errors.js'

describe('error hierarchy', () => {
  it('should have correct names', () => {
    expect(new TextricError('test').name).toBe('TextricError')
    expect(new FontLoadError('test').name).toBe('FontLoadError')
    expect(new FontNotFoundError('test').name).toBe('FontNotFoundError')
    expect(new InvalidOptionsError('test').name).toBe('InvalidOptionsError')
  })

  it('should all be instances of TextricError', () => {
    expect(new FontLoadError('test')).toBeInstanceOf(TextricError)
    expect(new FontNotFoundError('test')).toBeInstanceOf(TextricError)
    expect(new InvalidOptionsError('test')).toBeInstanceOf(TextricError)
  })

  it('should all be instances of Error', () => {
    expect(new TextricError('test')).toBeInstanceOf(Error)
    expect(new FontLoadError('test')).toBeInstanceOf(Error)
  })

  it('should preserve message', () => {
    const msg = 'Font "Inter" not found'
    expect(new FontNotFoundError(msg).message).toBe(msg)
  })

  it('should be distinguishable via instanceof', () => {
    const e = new FontLoadError('test')
    expect(e instanceof FontLoadError).toBe(true)
    expect(e instanceof FontNotFoundError).toBe(false)
    expect(e instanceof InvalidOptionsError).toBe(false)
  })
})
