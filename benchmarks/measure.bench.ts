import { bench, describe } from 'vitest'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import opentype from 'opentype.js'
import { createMeasurer } from '../src/internal/measurer.js'
import type { Measurer, BatchItem } from '../src/types.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FONT_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')
const FONT_BUFFER = readFileSync(FONT_PATH)
const FONT_ARRAY_BUFFER = FONT_BUFFER.buffer.slice(
  FONT_BUFFER.byteOffset,
  FONT_BUFFER.byteOffset + FONT_BUFFER.byteLength,
)

// Raw opentype.js font for baseline comparison
const rawFont = opentype.loadSync(FONT_PATH)

// Pre-created measurer (shared across benchmarks, simulates warm state)
let m: Measurer

// Corpus
const SHORT_LATIN = 'Submit Order'
const MEDIUM_LATIN = 'Revenue increased 23% compared to last week, driven primarily by the new subscription tier launched on Tuesday. The team expects continued growth through Q4.'
const LONG_LATIN = MEDIUM_LATIN.repeat(6) // ~1000 chars
const HUGE_LATIN = MEDIUM_LATIN.repeat(60) // ~10000 chars

const SHORT_CJK = '提交订单'
const MEDIUM_CJK = '本季度收入同比增长百分之二十三，主要由新上线的订阅服务推动。团队预计第四季度将持续增长，并计划推出更多高级功能以满足企业客户需求。'
const LONG_CJK = MEDIUM_CJK.repeat(8) // ~1000 chars
const HUGE_CJK = MEDIUM_CJK.repeat(80) // ~10000 chars

const MIXED = 'Revenue 增长了 23%, reaching a new record of ¥12,450. 团队预计 Q4 will see continued growth.'

// Batch items generator
function generateBatchItems(count: number): BatchItem[] {
  const templates: BatchItem[] = [
    { text: 'Dashboard', font: 'Inter', size: 24, weight: 700 },
    { text: 'Welcome back, Alex', font: 'Inter', size: 14 },
    { text: '$12,450.00', font: 'Inter', size: 32, weight: 700 },
    { text: 'Revenue this month', font: 'Inter', size: 12 },
    { text: MEDIUM_LATIN, font: 'Inter', size: 14, maxWidth: 300 },
    { text: SHORT_CJK, font: 'Inter', size: 14 },
    { text: MEDIUM_CJK, font: 'Inter', size: 14, maxWidth: 280 },
    { text: 'View Details →', font: 'Inter', size: 13 },
    { text: 'Last updated: March 31, 2026', font: 'Inter', size: 11 },
    { text: MIXED, font: 'Inter', size: 14, maxWidth: 320 },
  ]
  const items: BatchItem[] = []
  for (let i = 0; i < count; i++) {
    items.push(templates[i % templates.length]!)
  }
  return items
}

// Rich text spans
const richSpans = [
  { text: 'Revenue increased ', font: 'Inter', size: 14 },
  { text: '23%', font: 'Inter', size: 14, weight: 700 },
  { text: ' compared to last week, driven by the ', font: 'Inter', size: 14 },
  { text: 'new subscription tier', font: 'Inter', size: 14, weight: 700 },
  { text: ' launched on Tuesday.', font: 'Inter', size: 14 },
]

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Vitest bench doesn't have beforeAll, so we use a lazy init pattern
async function getMeasurer(): Promise<Measurer> {
  if (!m) {
    m = await createMeasurer({
      fonts: [
        { family: 'Inter', data: FONT_ARRAY_BUFFER, weight: 400 },
        { family: 'Inter', path: BOLD_PATH, weight: 700 },
      ],
      cacheDir: null,
    })
  }
  return m
}

// Ensure measurer is ready before benchmarks
const measurerPromise = getMeasurer()

// Sink to prevent dead-code elimination
let sink: unknown = 0

// ===========================================================================
// DIMENSION 1: Cold Start — Full Pipeline
// ===========================================================================

describe('Cold Start', () => {
  bench('import → createMeasurer → first measure (from buffer)', async () => {
    const fresh = await createMeasurer({
      fonts: [{ family: 'Inter', data: FONT_ARRAY_BUFFER, weight: 400 }],
      cacheDir: null,
    })
    sink = fresh.measure('Hello World', { font: 'Inter', size: 16 })
  })

  bench('font parse from disk (Inter Regular, 325KB)', async () => {
    const fresh = await createMeasurer({
      fonts: [{ family: 'Inter', path: FONT_PATH, weight: 400 }],
      cacheDir: null,
    })
    sink = fresh.measure('x', { font: 'Inter', size: 16 })
  })
})

// ===========================================================================
// DIMENSION 2: Single Operation Latency (font cached)
// ===========================================================================

describe('Single-line Measurement', async () => {
  const m = await measurerPromise

  bench('Latin 12 chars', () => { sink = m.measure(SHORT_LATIN, { font: 'Inter', size: 16 }) })
  bench('Latin 160 chars', () => { sink = m.measure(MEDIUM_LATIN, { font: 'Inter', size: 14 }) })
  bench('CJK 4 chars', () => { sink = m.measure(SHORT_CJK, { font: 'Inter', size: 16 }) })
  bench('CJK 80 chars', () => { sink = m.measure(MEDIUM_CJK, { font: 'Inter', size: 14 }) })
  bench('Mixed 90 chars', () => { sink = m.measure(MIXED, { font: 'Inter', size: 14 }) })
})

describe('Multi-line Wrapping (maxWidth: 300px)', async () => {
  const m = await measurerPromise

  bench('Latin ~160 chars', () => { sink = m.measure(MEDIUM_LATIN, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('Latin ~1000 chars', () => { sink = m.measure(LONG_LATIN, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('CJK ~80 chars', () => { sink = m.measure(MEDIUM_CJK, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('CJK ~1000 chars', () => { sink = m.measure(LONG_CJK, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('Mixed ~90 chars', () => { sink = m.measure(MIXED, { font: 'Inter', size: 14, maxWidth: 300 }) })
})

describe('Rich Text (5 spans, ~120 chars)', async () => {
  const m = await measurerPromise

  bench('single line (no maxWidth)', () => { sink = m.measureRichText(richSpans) })
  bench('wrapped (maxWidth: 300px)', () => { sink = m.measureRichText(richSpans, { maxWidth: 300 }) })
})

describe('Special APIs', async () => {
  const m = await measurerPromise

  bench('shrinkWrap (binary search)', () => {
    sink = m.shrinkWrap(MEDIUM_LATIN, { font: 'Inter', size: 14, maxLines: 3 })
  })

  bench('fitText (font size search)', () => {
    sink = m.fitText(MEDIUM_LATIN, { font: 'Inter', maxWidth: 300, maxHeight: 100 })
  })

  bench('estimateCharCount', () => {
    sink = m.estimateCharCount({ font: 'Inter', size: 14, maxWidth: 300 })
  })
})

// ===========================================================================
// DIMENSION 3: Batch Throughput (mass scale)
// ===========================================================================

describe('Batch Throughput', async () => {
  const m = await measurerPromise

  const batch1k = generateBatchItems(1_000)
  const batch5k = generateBatchItems(5_000)
  const batch10k = generateBatchItems(10_000)
  const batch20k = generateBatchItems(20_000)

  bench('1,000 items', () => { sink = m.measureBatch(batch1k) })
  bench('5,000 items', () => { sink = m.measureBatch(batch5k) })
  bench('10,000 items', () => { sink = m.measureBatch(batch10k) })
  bench('20,000 items', () => { sink = m.measureBatch(batch20k) })
})

// ===========================================================================
// DIMENSION 4: Scaling Curve (text length vs time)
// ===========================================================================

describe('Scaling: text length → wrap time (maxWidth: 300px)', async () => {
  const m = await measurerPromise

  const text10 = 'Hello Wrld'
  const text100 = MEDIUM_LATIN.slice(0, 100)
  const text1000 = LONG_LATIN.slice(0, 1000)
  const text10000 = HUGE_LATIN.slice(0, 10000)

  bench('10 chars', () => { sink = m.measure(text10, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('100 chars', () => { sink = m.measure(text100, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('1,000 chars', () => { sink = m.measure(text1000, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('10,000 chars', () => { sink = m.measure(text10000, { font: 'Inter', size: 14, maxWidth: 300 }) })
})

describe('Scaling: CJK text length → wrap time (maxWidth: 300px)', async () => {
  const m = await measurerPromise

  const cjk10 = MEDIUM_CJK.slice(0, 10)
  const cjk100 = MEDIUM_CJK.slice(0, 100)
  const cjk1000 = LONG_CJK.slice(0, 1000)
  const cjk10000 = HUGE_CJK.slice(0, 10000)

  bench('10 chars', () => { sink = m.measure(cjk10, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('100 chars', () => { sink = m.measure(cjk100, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('1,000 chars', () => { sink = m.measure(cjk1000, { font: 'Inter', size: 14, maxWidth: 300 }) })
  bench('10,000 chars', () => { sink = m.measure(cjk10000, { font: 'Inter', size: 14, maxWidth: 300 }) })
})

// ===========================================================================
// DIMENSION 5: Memory (reported via process.memoryUsage)
// ===========================================================================

describe('Memory', () => {
  bench('measure 10,000 texts and report heap', async () => {
    const fresh = await createMeasurer({
      fonts: [{ family: 'Inter', data: FONT_ARRAY_BUFFER, weight: 400 }],
      cacheDir: null,
    })
    const items = generateBatchItems(10_000)
    sink = fresh.measureBatch(items)
    // Memory is observed externally; sink prevents GC
  })
})

// ===========================================================================
// DIMENSION 6: Textric Overhead vs Raw opentype.js
// ===========================================================================

describe('Overhead: Textric vs raw opentype.js', async () => {
  const m = await measurerPromise

  bench('raw opentype.js getAdvanceWidth (160 chars)', () => {
    sink = rawFont.getAdvanceWidth(MEDIUM_LATIN, 14)
  })

  bench('Textric measure() single-line (160 chars)', () => {
    sink = m.measure(MEDIUM_LATIN, { font: 'Inter', size: 14 })
  })

  bench('raw opentype.js getAdvanceWidth (1000 chars)', () => {
    sink = rawFont.getAdvanceWidth(LONG_LATIN, 14)
  })

  bench('Textric measure() single-line (1000 chars)', () => {
    sink = m.measure(LONG_LATIN, { font: 'Inter', size: 14 })
  })
})
