# Contributing to Textric

Thanks for your interest in contributing to Textric!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/ShiyuCheng2018/textric.git
cd textric

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run benchmarks
pnpm bench
```

## Project Structure

```
textric/
├── src/
│   ├── index.ts              # Public API — createMeasurer + type exports
│   ├── wrap.ts               # Sub-path entry — wrapText + wrapRichText
│   ├── align.ts              # Sub-path entry — alignment utilities (alignLines, alignRichTextResult)
│   ├── types.ts              # All public type definitions (interfaces)
│   └── internal/
│       ├── measurer.ts       # Factory function — font loading + measurement orchestration
│       ├── measure.ts        # Core measurement — singleLineMeasure, createMeasureWidthFn, getFontMetrics
│       ├── wrap-core.ts      # Plain text wrapping algorithm (word-boundary + CJK + kinsoku)
│       ├── rich-wrap-core.ts # Rich text wrapping (multi-span, baseline alignment)
│       ├── segment.ts        # Text segmentation — spans → tokens (text/space/newline)
│       ├── shrink-wrap.ts    # Binary search for optimal container width
│       ├── font-registry.ts  # Font registration + weight/style fallback matching
│       ├── font-loader.ts    # Load fonts from local file paths or in-memory buffers
│       ├── font-cache.ts     # LRU memory cache
│       ├── cjk.ts            # CJK character detection + kinsoku rules
│       ├── grapheme.ts       # Intl.Segmenter grapheme cluster segmentation
│       ├── errors.ts         # Error class hierarchy
│       └── utils.ts          # Shared utilities
├── test/
│   ├── unit/                 # Pure logic tests (mock measureWidth, no I/O)
│   ├── integration/          # End-to-end tests (real fonts, full pipeline)
│   ├── fixtures/fonts/       # Test font files (Inter-Regular.ttf, Inter-Bold.ttf)
│   └── helpers/              # Mock utilities
├── docs/
│   ├── api/                  # API reference (measurer, wrap, rich-text)
│   └── guides/               # How-to guides (getting-started, serverless, performance)
└── examples/
    ├── basic.ts
    └── rich-text.ts
```

## Architecture

Textric is built on three core layers:

### 1. Font Layer (`measure.ts`, `font-cache.ts`)
- Parses font files using opentype.js
- Extracts glyph advance widths with kerning pairs
- LRU cache for parsed font objects

### 2. Wrapping Layer (`wrap.ts`)
- Pure function — no I/O, no side effects
- Takes a `MeasureWidthFn` callback (injected by the font layer)
- CJK character-level breaking + Latin word-boundary breaking
- Truncation support (maxLines / maxHeight)

### 3. Font Loading (`font-loader.ts`)
- Loads `.ttf` / `.woff` / `.otf` from local file paths or in-memory buffers
- No network I/O — all fonts are provided by the caller

## Design Principles

1. **Pure JS, zero native deps, zero network I/O.** Never add dependencies that require native compilation (Cairo, Pango, node-canvas, etc.). Never make network requests.
2. **Font layer is the only async boundary.** Font loading is async (file I/O); measurement is sync. Once fonts are loaded, `measure()` is a pure, fast, synchronous call.
3. **wrapText is a pure function.** It takes a measurement callback, not a font object. This makes it testable and portable.
4. **Bring your own fonts.** The library loads fonts from local files or buffers. The caller is responsible for obtaining font files.
5. **Honest performance claims.** Always include font loading time in benchmarks. Never hide cold-start costs.

## Code Conventions

- TypeScript strict mode
- Vitest for testing
- No classes for public API — prefer factory functions (`createMeasurer()`, not `new Measurer()`)
- Exported types use `interface`, internal types use `type`
- No default exports

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/wrap.test.ts

# Run with coverage
pnpm test:coverage
```

**Testing guidelines:**
- Every public API function must have tests
- Wrapping algorithm tests should cover: Latin, CJK, mixed, empty string, single char, exact-width fit, truncation
- Measurement tests should use bundled test fonts (not Google Fonts) for reproducibility

## Benchmarks

```bash
pnpm bench
```

Benchmarks live in `benchmarks/` and use Vitest bench. Always run on a quiet machine. Include both cold (first measurement with font loading) and hot (cached font) scenarios.

## Pull Requests

1. Fork the repo and create a feature branch
2. Add tests for new functionality
3. Run `pnpm test && pnpm lint` before submitting
4. Keep PRs focused — one feature or fix per PR
5. Update docs if the public API changes

## Releasing

Maintainers only:

```bash
# Bump version
pnpm version patch  # or minor / major

# Publish
pnpm publish

# Push tags
git push --follow-tags
```
