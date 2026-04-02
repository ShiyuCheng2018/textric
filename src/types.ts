// ---------------------------------------------------------------------------
// Public types — all exported as `interface` per project convention
// ---------------------------------------------------------------------------

// --- Font Source ---

export interface FontSourcePath {
  family: string
  path: string
  weight?: number
  style?: 'normal' | 'italic'
  data?: never
}

export interface FontSourceData {
  family: string
  data: ArrayBuffer | Uint8Array
  weight?: number
  style?: 'normal' | 'italic'
  path?: never
}

export type FontSource = FontSourcePath | FontSourceData

// --- Measurer Creation ---

export interface CreateMeasurerOptions {
  fonts?: FontSource[]
  /** Maximum number of font variants to cache in memory. Default: 100. */
  maxCachedFonts?: number
}

// --- Measurement Options ---

export interface MeasureOptions {
  /** Font family name. */
  font: string
  /** Font size in pixels. */
  size: number
  /** Font weight (100-900). Default: 400. */
  weight?: number
  /** Font style. Default: 'normal'. */
  style?: 'normal' | 'italic'
  /** Extra letter spacing in pixels. Default: 0. */
  letterSpacing?: number
  /** Line height multiplier (e.g. 1.5). Default: 1.2. */
  lineHeight?: number
  /** Maximum line width in pixels. Enables multi-line wrapping. */
  maxWidth?: number
  /** Maximum number of visible lines. Only effective when `maxWidth` is set. */
  maxLines?: number
  /** Maximum visible height in pixels. Only effective when `maxWidth` is set. */
  maxHeight?: number
  /** Extra spacing between paragraphs (on `\n`) in pixels. Default: 0. */
  paragraphSpacing?: number
  /** Ellipsis string to append when text is truncated (e.g. '...' or '…'). */
  ellipsis?: string
  /** First-line indent in pixels. Reduces first line's effective maxWidth. Default: 0. */
  indent?: number
  /** Hanging indent in pixels. Reduces subsequent lines' effective maxWidth. Default: 0. */
  hangingIndent?: number
}

// --- Resolved Font Info ---

export interface ResolvedFontInfo {
  family: string
  weight: number
  style: 'normal' | 'italic'
}

// --- Measurement Results ---

export interface SingleLineMeasureResult {
  width: number
  height: number
  ascent: number
  descent: number
  /** The font actually used for measurement. */
  resolvedFont: ResolvedFontInfo
  /** True if the font is missing glyphs for some characters in the text. */
  missingGlyphs: boolean
}

export interface MultiLineMeasureResult {
  width: number
  height: number
  lines: string[]
  lineWidths: number[]
  lineCount: number
  totalLineCount: number
  truncated: boolean
  /** The font actually used for measurement. */
  resolvedFont: ResolvedFontInfo
  /** True if the font is missing glyphs for some characters in the text. */
  missingGlyphs: boolean
}

export type MeasureResult = SingleLineMeasureResult | MultiLineMeasureResult

// --- Batch ---

export interface BatchItem extends MeasureOptions {
  text: string
}

// --- Shrink Wrap ---

export interface ShrinkWrapOptions {
  font: string
  size: number
  weight?: number
  style?: 'normal' | 'italic'
  letterSpacing?: number
  lineHeight?: number
  maxLines: number
}

export interface ShrinkWrapResult {
  width: number
  height: number
  lines: string[]
  lineCount: number
}

// --- Fit Text ---

export interface FitTextOptions {
  font: string
  maxWidth: number
  maxHeight: number
  weight?: number
  style?: 'normal' | 'italic'
  letterSpacing?: number
  lineHeight?: number
  maxLines?: number
  minSize?: number
  maxSize?: number
}

export interface FitTextResult {
  size: number
  width: number
  height: number
  lines: string[]
  lineCount: number
}

// --- Load Font ---

interface LoadFontBase {
  family: string
  weight?: number
  style?: 'normal' | 'italic'
}

export type LoadFontOptions =
  | (LoadFontBase & { path: string; data?: never })
  | (LoadFontBase & { data: ArrayBuffer | Uint8Array; path?: never })

// --- Font Info ---

export interface FontInfo {
  weights: number[]
  styles: Array<'normal' | 'italic'>
}

export interface FontMetricsDetailed {
  ascent: number
  descent: number
  unitsPerEm: number
  underlineOffset: number
  underlineThickness: number
}

// --- Rich Text ---

export interface RichTextSpan {
  text: string
  font: string
  size: number
  weight?: number
  style?: 'normal' | 'italic'
  letterSpacing?: number
}

export interface RichTextOptions {
  maxWidth?: number
  lineHeight?: number
  maxLines?: number
  maxHeight?: number
}

export interface RichTextLineFragment {
  spanIndex: number
  text: string
  x: number
  width: number
  font: string
  size: number
  weight: number
  style: 'normal' | 'italic'
  letterSpacing: number
}

export interface RichTextLine {
  fragments: RichTextLineFragment[]
  width: number
  ascent: number
  descent: number
  height: number
  y: number
  baseline: number
}

export interface RichTextResult {
  width: number
  height: number
  lines: RichTextLine[]
  lineCount: number
  totalLineCount: number
  truncated: boolean
}

// --- Estimate Char Count ---

export interface EstimateCharCountOptions {
  font: string
  size: number
  maxWidth: number
  weight?: number
  style?: 'normal' | 'italic'
  /**
   * Characters to sample for average width estimation.
   * The sample is measured as a contiguous string (with kerning),
   * then divided by character count.
   * Default: A-Za-z0-9 (62 Latin letters + digits).
   * For CJK or other scripts, pass representative characters (e.g. '中').
   */
  sampleText?: string
}

// --- Measurer Instance ---

export interface Measurer {
  measure(text: string, options: MeasureOptions & { maxWidth: number }): MultiLineMeasureResult
  measure(text: string, options: MeasureOptions): SingleLineMeasureResult

  measureBatch(items: BatchItem[]): MeasureResult[]

  measureRichText(spans: RichTextSpan[], options?: RichTextOptions): RichTextResult

  shrinkWrap(text: string, options: ShrinkWrapOptions): ShrinkWrapResult
  fitText(text: string, options: FitTextOptions): FitTextResult

  loadFont(options: LoadFontOptions): Promise<void>
  getFontInfo(family: string): FontInfo | null
  getFontMetrics(font: string, size: number, weight?: number, style?: 'normal' | 'italic'): FontMetricsDetailed | null
  estimateCharCount(options: EstimateCharCountOptions): number
}

// --- Low-level Wrap Types ---

export interface MeasureWidthFn {
  (text: string): number
}

export interface WrapOptions {
  lineHeight: number
  letterSpacing?: number
  maxLines?: number
  maxHeight?: number
  paragraphSpacing?: number
  ellipsis?: string
  indent?: number
  hangingIndent?: number
}

export interface WrapResult {
  lines: string[]
  lineCount: number
  totalLineCount: number
  truncated: boolean
  height: number
  maxLineWidth: number
}

// --- Low-level Rich Text Wrap Types ---

export interface SpanStyle {
  font: string
  size: number
  weight: number
  style: 'normal' | 'italic'
  letterSpacing: number
}

export interface SpanMetrics {
  ascent: number
  descent: number
}

export interface MeasureSpanWidthFn {
  (text: string, style: SpanStyle): number
}

export interface GetSpanMetricsFn {
  (style: SpanStyle): SpanMetrics
}

export interface WrapRichTextSpan {
  text: string
  style: SpanStyle
}

export interface WrapRichTextOptions {
  /**
   * Line height in pixels.
   * - Without `lineHeightMultiplier`: uniform height for all lines.
   * - With `lineHeightMultiplier`: fallback height for empty lines only
   *   (lines with spans use `maxFontSizeOnLine * lineHeightMultiplier`).
   */
  lineHeightPx: number
  /**
   * Per-line dynamic height multiplier. When set, each line's height equals
   * the tallest font size on that line times this value.
   * Empty lines (from `\n`) fall back to `lineHeightPx`.
   */
  lineHeightMultiplier?: number
  maxLines?: number
  maxHeight?: number
}

export interface WrapFragment {
  spanIndex: number
  text: string
  x: number
  width: number
}

export interface WrapRichLine {
  fragments: WrapFragment[]
  width: number
  ascent: number
  descent: number
  height: number
  y: number
  baseline: number
}

export interface WrapRichTextResult {
  lines: WrapRichLine[]
  lineCount: number
  totalLineCount: number
  truncated: boolean
  height: number
  maxLineWidth: number
}
