# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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

