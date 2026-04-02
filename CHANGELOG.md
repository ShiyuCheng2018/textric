# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2.0.0] - 2026-04-02

### Breaking Changes

- **`measureRichText()` now uses per-line dynamic line heights.** Each line's height is based on the tallest span on that line, not the global max font size. Mixed-size layouts will return different `height`, `lines[i].height`, and `lines[i].y` values compared to v1.
- **`WrapRichTextOptions.lineHeight` renamed to `lineHeightPx`** for clarity. Affects direct consumers of `textric/wrap`.
- **`estimateCharCount()` uses a 62-character sample** (A-Za-z0-9) instead of single 'x'. Returns more accurate but different values.

### Features

- Per-line dynamic line height for rich text — a 24px title + 12px body now produces tighter layout instead of all lines using 24px-based height
- `estimateCharCount()` accepts optional `sampleText` parameter for domain-specific estimation (e.g. pass CJK characters for CJK text)
- `WrapRichTextOptions.lineHeightMultiplier` option for low-level `textric/wrap` users
- New `EstimateCharCountOptions` named interface for better IDE discoverability

### Migration Guide

**If you use `measureRichText()` with mixed font sizes:**
Your `result.height` will decrease (each line is now sized to its tallest span, not the global tallest). `lines[i].y` values shift accordingly. If your renderer hardcodes y-offsets from v1 output, re-derive them from the new `lines[i].y` values. If all your spans use the same `size`, output is identical to v1.

**If you import from `textric/wrap`:**
Rename `lineHeight` to `lineHeightPx` in your `WrapRichTextOptions`. TypeScript will flag this at compile time.

**If you use `estimateCharCount()`:**
Return values change (more accurate). No API change needed unless you pinned exact values in snapshots.

## [1.0.0] - 2026-03-31

### Core
- `createMeasurer()` factory with async font pre-loading
- `measure()` — single-line and multi-line text measurement
- `measureRichText()` — mixed-style spans with baseline alignment
- `measureBatch()` — batch measurement
- `shrinkWrap()` — binary search for optimal container width
- `fitText()` — binary search for optimal font size within a container
- `estimateCharCount()` — estimate characters that fit in a given width
- `getFontMetrics()` — detailed font metrics (ascent, descent, underline offset/thickness)
- `getFontInfo()` — available weights and styles for a loaded font

### Text Wrapping
- Latin word-boundary wrapping
- CJK character-level wrapping
- CJK kinsoku (line-break prohibition rules for punctuation)
- Mixed Latin + CJK wrapping
- `\r\n` / `\r` line ending normalization
- Tab (`\t`) treated as wrappable whitespace
- Ellipsis truncation (`ellipsis` option)
- Paragraph spacing (`paragraphSpacing` option)
- First-line indent and hanging indent (indent / hangingIndent options)
- Low-level `wrapText()` and `wrapRichText()` exported via `textric/wrap`

### Font Loading
- Local font files (path) and in-memory buffers
- LRU memory cache (configurable via `maxCachedFonts`)
- Font weight/style fallback matching

### Error Handling
- `missingGlyphs` detection (`.notdef` glyph check)
- Custom error hierarchy: `TextricError` > `FontLoadError` / `FontNotFoundError` / `InvalidOptionsError`
- Input validation on all public APIs

### Platform Support
- Pure JavaScript — zero native dependencies
- Edge Runtime compatible (dynamic imports, no top-level `fs`/`os`/`crypto`)
- Node.js >= 18, Bun, Deno, Cloudflare Workers, AWS Lambda, Vercel Edge

