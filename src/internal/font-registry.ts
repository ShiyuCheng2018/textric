import type opentype from 'opentype.js'
import type { FontInfo } from '../types.js'

type FontStyle = 'normal' | 'italic'

interface ResolveResult {
  font: opentype.Font
  exact: boolean
  weight: number
  style: FontStyle
}

function variantKey(weight: number, style: FontStyle): string {
  return `${weight}-${style}`
}

/**
 * In-memory registry of loaded font objects.
 * Supports exact lookup and weight/style fallback.
 */
export class FontRegistry {
  // family -> (variantKey -> font)
  private readonly families = new Map<string, Map<string, opentype.Font>>()

  register(family: string, weight: number, style: FontStyle, font: opentype.Font): void {
    let variants = this.families.get(family)
    if (!variants) {
      variants = new Map()
      this.families.set(family, variants)
    }
    variants.set(variantKey(weight, style), font)
  }

  /**
   * Exact lookup. Returns null if not found.
   */
  resolve(family: string, weight: number, style: FontStyle): opentype.Font | null {
    const variants = this.families.get(family)
    if (!variants) return null
    return variants.get(variantKey(weight, style)) ?? null
  }

  /**
   * Lookup with fallback:
   * 1. Exact match
   * 2. Same style, closest weight
   * 3. Opposite style, closest weight
   */
  resolveWithFallback(family: string, weight: number, style: FontStyle): ResolveResult | null {
    const variants = this.families.get(family)
    if (!variants) return null

    // 1. Exact match
    const exact = variants.get(variantKey(weight, style))
    if (exact) return { font: exact, exact: true, weight, style }

    // 2. Same style, closest weight
    const sameStyleResult = this.findClosestWeight(variants, weight, style)
    if (sameStyleResult) return { font: sameStyleResult.font, exact: false, weight: sameStyleResult.weight, style }

    // 3. Opposite style, closest weight
    const oppositeStyle: FontStyle = style === 'normal' ? 'italic' : 'normal'
    const fallbackStyleResult = this.findClosestWeight(variants, weight, oppositeStyle)
    if (fallbackStyleResult) return { font: fallbackStyleResult.font, exact: false, weight: fallbackStyleResult.weight, style: oppositeStyle }

    return null
  }

  has(family: string, weight: number, style: FontStyle): boolean {
    return this.resolve(family, weight, style) !== null
  }

  getInfo(family: string): FontInfo | null {
    const variants = this.families.get(family)
    if (!variants) return null

    const weights = new Set<number>()
    const styles = new Set<FontStyle>()

    for (const key of variants.keys()) {
      const [w, s] = key.split('-') as [string, FontStyle]
      weights.add(Number(w))
      styles.add(s)
    }

    return {
      weights: [...weights].sort((a, b) => a - b),
      styles: [...styles],
    }
  }

  private findClosestWeight(
    variants: Map<string, opentype.Font>,
    targetWeight: number,
    style: FontStyle,
  ): { font: opentype.Font; weight: number } | null {
    let closest: { font: opentype.Font; weight: number } | null = null
    let closestDist = Infinity

    for (const [key, font] of variants) {
      const [w, s] = key.split('-') as [string, string]
      if (s !== style) continue
      const numWeight = Number(w)
      const dist = Math.abs(numWeight - targetWeight)
      if (dist < closestDist) {
        closestDist = dist
        closest = { font, weight: numWeight }
      }
    }

    return closest
  }
}
