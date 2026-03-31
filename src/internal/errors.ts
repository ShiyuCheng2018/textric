export class TextricError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TextricError'
  }
}

export class FontLoadError extends TextricError {
  constructor(message: string) {
    super(message)
    this.name = 'FontLoadError'
  }
}

export class FontNotFoundError extends TextricError {
  constructor(message: string) {
    super(message)
    this.name = 'FontNotFoundError'
  }
}

export class InvalidOptionsError extends TextricError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidOptionsError'
  }
}
