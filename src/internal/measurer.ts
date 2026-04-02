import type opentype from 'opentype.js'
import { FontRegistry } from './font-registry.js'
import { LRUCache } from './font-cache.js'
import { loadFontFromPath, loadFontFromData } from './font-loader.js'
import { singleLineMeasure, createMeasureWidthFn, getFontMetrics, hasMissingGlyphs } from './measure.js'
import { wrapText } from './wrap-core.js'
import { wrapRichText } from './rich-wrap-core.js'
import { shrinkWrap as shrinkWrapInternal } from './shrink-wrap.js'
import { FontNotFoundError, InvalidOptionsError } from './errors.js'
import type {
  CreateMeasurerOptions,
  FontSource,
  Measurer,
  MeasureOptions,
  MeasureResult,
  SingleLineMeasureResult,
  MultiLineMeasureResult,
  BatchItem,
  ShrinkWrapOptions,
  ShrinkWrapResult,
  RichTextSpan,
  RichTextOptions,
  RichTextResult,
  RichTextLineFragment,
  LoadFontOptions,
  FontInfo,
  MeasureSpanWidthFn,
  GetSpanMetricsFn,
  SpanStyle,
  WrapRichTextSpan,
} from '../types.js'

/**
 * Create a measurer instance with pre-loaded fonts.
 * Pure computation — zero network I/O.
 */
export async function createMeasurer(
  options: CreateMeasurerOptions = {},
): Promise<Measurer> {
  const registry = new FontRegistry()
  const fontCache = new LRUCache<string, opentype.Font>(options.maxCachedFonts ?? 100)

  // Pre-load fonts
  if (options.fonts) {
    for (const source of options.fonts) {
      const font = await loadFontSource(source)
      const weight = source.weight ?? 400
      const style = source.style ?? 'normal'
      registerFont(source.family, weight, style, font)
    }
  }

  function registerFont(family: string, weight: number, style: 'normal' | 'italic', font: opentype.Font): void {
    registry.register(family, weight, style, font)
    fontCache.set(fontCacheKey(family, weight, style), font)
  }

  type FontResolution = {
    font: opentype.Font
    resolvedFamily: string
    resolvedWeight: number
    resolvedStyle: 'normal' | 'italic'
  }

  // --- font resolution: exact match → same-family weight fallback → throw ---
  function resolveFont(
    family: string,
    weight: number,
    style: 'normal' | 'italic',
  ): FontResolution {
    // 1. Exact cache hit
    const cached = fontCache.get(fontCacheKey(family, weight, style))
    if (cached) return { font: cached, resolvedFamily: family, resolvedWeight: weight, resolvedStyle: style }

    // 2. Same-family weight/style fallback
    const resolved = registry.resolveWithFallback(family, weight, style)
    if (resolved) return { font: resolved.font, resolvedFamily: family, resolvedWeight: resolved.weight, resolvedStyle: resolved.style }

    // 3. No cross-family fallback — throw
    throw new FontNotFoundError(
      `Font "${family}" (weight: ${weight}, style: ${style}) is not loaded.\n` +
      `To fix: load the font via createMeasurer({ fonts: [{ family: '${family}', data: buffer }] }) or loadFont().`
    )
  }

  // --- input validation ---
  function validateMeasureOptions(opts: MeasureOptions): void {
    if (!opts.font) throw new InvalidOptionsError('options.font is required and must be a non-empty string.')
    if (typeof opts.size !== 'number' || opts.size <= 0) throw new InvalidOptionsError(`options.size must be a positive number, got ${opts.size}.`)
    if (opts.maxWidth !== undefined && (typeof opts.maxWidth !== 'number' || opts.maxWidth <= 0 || !Number.isFinite(opts.maxWidth))) {
      throw new InvalidOptionsError(`options.maxWidth must be a positive finite number, got ${opts.maxWidth}.`)
    }
    if (opts.lineHeight !== undefined && (typeof opts.lineHeight !== 'number' || opts.lineHeight <= 0)) {
      throw new InvalidOptionsError(`options.lineHeight must be a positive number, got ${opts.lineHeight}.`)
    }
    // maxLines/maxHeight without maxWidth are silently ignored (documented in JSDoc on MeasureOptions)
  }

  function validateRichTextSpans(spans: RichTextSpan[]): void {
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i]!
      if (!s.font) throw new InvalidOptionsError(`spans[${i}].font is required and must be a non-empty string.`)
      if (typeof s.size !== 'number' || s.size <= 0) throw new InvalidOptionsError(`spans[${i}].size must be a positive number, got ${s.size}.`)
    }
  }

  // --- measure (plain text) ---
  function measure(text: string, opts: MeasureOptions & { maxWidth: number }): MultiLineMeasureResult
  function measure(text: string, opts: MeasureOptions): SingleLineMeasureResult
  function measure(text: string, opts: MeasureOptions): MeasureResult {
    validateMeasureOptions(opts)
    const weight = opts.weight ?? 400
    const style = opts.style ?? 'normal'
    const letterSpacing = opts.letterSpacing ?? 0
    const lineHeight = opts.lineHeight ?? 1.2

    const resolved = resolveFont(opts.font, weight, style)
    const rfi = { family: resolved.resolvedFamily, weight: resolved.resolvedWeight, style: resolved.resolvedStyle }
    const missing = hasMissingGlyphs(resolved.font, text)

    if (opts.maxWidth !== undefined) {
      const mw = createMeasureWidthFn(resolved.font, opts.size, letterSpacing)
      const lineHeightPx = opts.size * lineHeight
      const result = wrapText(text, opts.maxWidth, mw, {
        lineHeight: lineHeightPx,
        letterSpacing,
        maxLines: opts.maxLines,
        maxHeight: opts.maxHeight,
        paragraphSpacing: opts.paragraphSpacing,
        ellipsis: opts.ellipsis,
        indent: opts.indent,
        hangingIndent: opts.hangingIndent,
      })
      return {
        width: result.maxLineWidth,
        height: result.height,
        lines: result.lines,
        lineWidths: result.lines.map(line => mw(line)),
        lineCount: result.lineCount,
        totalLineCount: result.totalLineCount,
        truncated: result.truncated,
        resolvedFont: rfi,
        missingGlyphs: missing,
      }
    }

    const single = singleLineMeasure(resolved.font, text, opts.size, { lineHeight, letterSpacing })
    const metrics = getFontMetrics(resolved.font, opts.size)
    return {
      width: single.width,
      height: single.height,
      ascent: metrics.ascent,
      descent: metrics.descent,
      resolvedFont: rfi,
      missingGlyphs: missing,
    }
  }

  // --- measureRichText ---
  function measureRichTextImpl(
    spans: RichTextSpan[],
    opts?: RichTextOptions,
  ): RichTextResult {
    if (spans.length === 0) {
      return emptyRichTextResult()
    }
    validateRichTextSpans(spans)

    const lineHeight = opts?.lineHeight ?? 1.2

    const resolvedFonts: Array<{ font: opentype.Font; style: SpanStyle }> = []
    for (const span of spans) {
      const weight = span.weight ?? 400
      const fontStyle = span.style ?? 'normal'
      const ls = span.letterSpacing ?? 0
      const r = resolveFont(span.font, weight, fontStyle)
      resolvedFonts.push({
        font: r.font,
        style: { font: span.font, size: span.size, weight, style: fontStyle, letterSpacing: ls },
      })
    }

    return buildRichTextResult(spans, resolvedFonts, opts, lineHeight)
  }

  function buildRichTextResult(
    spans: RichTextSpan[],
    resolvedFonts: Array<{ font: opentype.Font; style: SpanStyle }>,
    opts: RichTextOptions | undefined,
    lineHeight: number,
  ): RichTextResult {
    // Pre-build O(1) lookup index
    const fontIndex = new Map<string, { font: opentype.Font; style: SpanStyle }>()
    for (const r of resolvedFonts) {
      const key = `${r.style.font}:${r.style.size}:${r.style.weight}:${r.style.style}:${r.style.letterSpacing}`
      if (!fontIndex.has(key)) fontIndex.set(key, r)
    }
    const fallbackResolved = resolvedFonts[0]!

    const measureSpanWidth: MeasureSpanWidthFn = (text, spanStyle) => {
      const key = `${spanStyle.font}:${spanStyle.size}:${spanStyle.weight}:${spanStyle.style}:${spanStyle.letterSpacing}`
      const resolved = fontIndex.get(key) ?? fallbackResolved
      if (text.length === 0) return 0
      const baseWidth = resolved.font.getAdvanceWidth(text, spanStyle.size)
      const charCount = [...text].length
      return baseWidth + spanStyle.letterSpacing * Math.max(0, charCount - 1)
    }

    const getMetrics: GetSpanMetricsFn = (spanStyle) => {
      const key = `${spanStyle.font}:${spanStyle.size}:${spanStyle.weight}:${spanStyle.style}:${spanStyle.letterSpacing}`
      const resolved = fontIndex.get(key) ?? fallbackResolved
      return getFontMetrics(resolved.font, spanStyle.size)
    }

    const wrapSpans: WrapRichTextSpan[] = spans.map((span, i) => ({
      text: span.text,
      style: resolvedFonts[i]!.style,
    }))

    const maxFontSize = spans.reduce((max, s) => s.size > max ? s.size : max, 0)
    const lineHeightPx = maxFontSize * lineHeight
    const maxWidth = opts?.maxWidth ?? Infinity

    const result = wrapRichText(wrapSpans, maxWidth, measureSpanWidth, getMetrics, {
      lineHeightPx: lineHeightPx,
      lineHeightMultiplier: lineHeight,
      maxLines: opts?.maxLines,
      maxHeight: opts?.maxHeight,
    })

    return {
      width: result.maxLineWidth,
      height: result.height,
      lines: result.lines.map(line => ({
        fragments: line.fragments.map(frag => toRichTextLineFragment(frag, resolvedFonts)),
        width: line.width,
        ascent: line.ascent,
        descent: line.descent,
        height: line.height,
        y: line.y,
        baseline: line.baseline,
      })),
      lineCount: result.lineCount,
      totalLineCount: result.totalLineCount,
      truncated: result.truncated,
    }
  }

  function toRichTextLineFragment(
    frag: { spanIndex: number; text: string; x: number; width: number },
    resolvedFonts: Array<{ font: opentype.Font; style: SpanStyle }>,
  ): RichTextLineFragment {
    const resolved = resolvedFonts[frag.spanIndex] ?? resolvedFonts[0]!
    return {
      spanIndex: frag.spanIndex,
      text: frag.text,
      x: frag.x,
      width: frag.width,
      font: resolved.style.font,
      size: resolved.style.size,
      weight: resolved.style.weight,
      style: resolved.style.style,
      letterSpacing: resolved.style.letterSpacing,
    }
  }

  // --- measureBatch ---
  function measureBatch(items: BatchItem[]): MeasureResult[] {
    return items.map(item => measure(item.text, item))
  }

  // --- fitText ---
  function fitTextImpl(text: string, opts: import('../types.js').FitTextOptions): import('../types.js').FitTextResult {
    const weight = opts.weight ?? 400
    const style = opts.style ?? 'normal'
    const letterSpacing = opts.letterSpacing ?? 0
    const lineHeight = opts.lineHeight ?? 1.2
    const rawMin = opts.minSize ?? 1
    const rawMax = opts.maxSize ?? opts.maxHeight
    const minSize = Math.min(rawMin, rawMax)
    const maxSize = Math.max(rawMin, rawMax)

    const { font } = resolveFont(opts.font, weight, style)

    let lo = minSize
    let hi = maxSize

    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2
      const mw = createMeasureWidthFn(font, mid, letterSpacing)
      const lineHeightPx = mid * lineHeight
      const result = wrapText(text, opts.maxWidth, mw, {
        lineHeight: lineHeightPx,
        letterSpacing,
        maxLines: opts.maxLines,
      })
      const totalHeight = result.lineCount * lineHeightPx
      if (totalHeight <= opts.maxHeight && (!opts.maxLines || result.totalLineCount <= opts.maxLines)) {
        lo = mid
      } else {
        hi = mid
      }
    }

    const finalSize = Math.floor(lo * 2) / 2
    const mw = createMeasureWidthFn(font, finalSize, letterSpacing)
    const lineHeightPx = finalSize * lineHeight
    const finalResult = wrapText(text, opts.maxWidth, mw, {
      lineHeight: lineHeightPx,
      letterSpacing,
      maxLines: opts.maxLines,
    })

    return {
      size: finalSize,
      width: finalResult.maxLineWidth,
      height: finalResult.height,
      lines: finalResult.lines,
      lineCount: finalResult.lineCount,
    }
  }

  // --- shrinkWrap ---
  function shrinkWrapImpl(text: string, opts: ShrinkWrapOptions): ShrinkWrapResult {
    const weight = opts.weight ?? 400
    const style = opts.style ?? 'normal'
    const letterSpacing = opts.letterSpacing ?? 0
    const lineHeight = opts.lineHeight ?? 1.2

    const { font } = resolveFont(opts.font, weight, style)
    const mw = createMeasureWidthFn(font, opts.size, letterSpacing)
    const lineHeightPx = opts.size * lineHeight

    return shrinkWrapInternal(text, mw, {
      lineHeight: lineHeightPx,
      maxLines: opts.maxLines,
      letterSpacing,
    })
  }

  // --- loadFont ---
  async function loadFont(loadOpts: LoadFontOptions): Promise<void> {
    const weight = loadOpts.weight ?? 400
    const style = loadOpts.style ?? 'normal'

    let font: opentype.Font

    if ('data' in loadOpts && loadOpts.data) {
      font = loadFontFromData(loadOpts.data)
    } else if ('path' in loadOpts && loadOpts.path) {
      font = await loadFontFromPath(loadOpts.path)
    } else {
      throw new InvalidOptionsError(
        `loadFont requires either 'path' or 'data'.\n` +
        `To fix: provide { path: '/path/to/font.ttf' } or { data: arrayBuffer }.`
      )
    }

    registerFont(loadOpts.family, weight, style, font)
  }

  // --- getFontInfo ---
  function getFontInfoImpl(family: string): FontInfo | null {
    return registry.getInfo(family)
  }

  // --- getFontMetrics (detailed) ---
  function getFontMetricsImpl(
    family: string,
    size: number,
    weight = 400,
    style: 'normal' | 'italic' = 'normal',
  ): import('../types.js').FontMetricsDetailed | null {
    const resolved = registry.resolveWithFallback(family, weight, style)
    if (!resolved) return null
    const font = resolved.font
    const scale = size / font.unitsPerEm
    return {
      ascent: font.ascender * scale,
      descent: Math.abs(font.descender) * scale,
      unitsPerEm: font.unitsPerEm,
      underlineOffset: (font.tables.post?.underlinePosition ?? -100) * scale,
      underlineThickness: (font.tables.post?.underlineThickness ?? 50) * scale,
    }
  }

  // --- estimateCharCount ---
  function estimateCharCountImpl(opts: {
    font: string; size: number; maxWidth: number;
    weight?: number; style?: 'normal' | 'italic'
  }): number {
    const weight = opts.weight ?? 400
    const style = opts.style ?? 'normal'
    const resolved = registry.resolveWithFallback(opts.font, weight, style)
    if (!resolved) return Math.floor(opts.maxWidth / (opts.size * 0.5))
    const avgWidth = resolved.font.getAdvanceWidth('x', opts.size)
    if (avgWidth <= 0) return 0
    return Math.floor(opts.maxWidth / avgWidth)
  }

  return {
    measure,
    measureBatch,
    measureRichText: measureRichTextImpl,
    shrinkWrap: shrinkWrapImpl,
    fitText: fitTextImpl,
    loadFont,
    getFontInfo: getFontInfoImpl,
    getFontMetrics: getFontMetricsImpl,
    estimateCharCount: estimateCharCountImpl,
  }
}

// --- helpers ---

function emptyRichTextResult(): RichTextResult {
  return {
    width: 0,
    height: 0,
    lines: [],
    lineCount: 0,
    totalLineCount: 0,
    truncated: false,
  }
}

async function loadFontSource(source: FontSource): Promise<opentype.Font> {
  if ('data' in source && source.data) {
    return loadFontFromData(source.data)
  }
  if ('path' in source && source.path) {
    return loadFontFromPath(source.path)
  }
  throw new InvalidOptionsError(
    `Font source for "${source.family}" requires either 'path' or 'data'.`
  )
}

function fontCacheKey(family: string, weight: number, style: 'normal' | 'italic'): string {
  return `${family}:${weight}:${style}`
}
