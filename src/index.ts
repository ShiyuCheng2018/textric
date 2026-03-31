export { createMeasurer } from './internal/measurer.js'
export { TextricError, FontLoadError, FontNotFoundError, InvalidOptionsError } from './internal/errors.js'

export type {
  // Measurer
  Measurer,
  CreateMeasurerOptions,

  // Font
  FontSource,
  FontSourcePath,
  FontSourceData,
  LoadFontOptions,
  FontInfo,
  FontMetricsDetailed,
  ResolvedFontInfo,

  // Measure
  MeasureOptions,
  MeasureResult,
  SingleLineMeasureResult,
  MultiLineMeasureResult,
  BatchItem,

  // Shrink Wrap
  ShrinkWrapOptions,
  ShrinkWrapResult,
  FitTextOptions,
  FitTextResult,

  // Rich Text
  RichTextSpan,
  RichTextOptions,
  RichTextResult,
  RichTextLine,
  RichTextLineFragment,
} from './types.js'
