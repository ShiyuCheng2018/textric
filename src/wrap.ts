export { wrapText } from './internal/wrap-core.js'
export { wrapRichText } from './internal/rich-wrap-core.js'

export type {
  // Plain text wrap
  MeasureWidthFn,
  WrapOptions,
  WrapResult,

  // Rich text wrap
  MeasureSpanWidthFn,
  GetSpanMetricsFn,
  SpanStyle,
  SpanMetrics,
  WrapRichTextSpan,
  WrapRichTextOptions,
  WrapRichTextResult,
  WrapRichLine,
  WrapFragment,
} from './types.js'
