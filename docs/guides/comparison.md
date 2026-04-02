# Textric vs Alternatives

## The Shift: Why Text Layout Is Moving Server-Side

Traditionally, text layout was the browser's job. You render text in the DOM, the browser calculates the layout, done.

But AI is changing this. When AI generates visual content — UI designs, slides, PDFs, emails, social images — it computes layout on the **server**, not in a browser. And layout computation requires knowing text dimensions.

```
Traditional:  User types → Browser renders → Browser handles layout
AI era:       AI generates → Server computes layout → Server needs text layout
```

This is why server-side text layout is becoming a real need.

## The Three Layers

```
Layer 3: DOM reflow           → getBoundingClientRect()
Layer 2: Canvas API           → ctx.measureText()        ← Pretext
Layer 1: Font file parsing    → font.getAdvanceWidth()    ← Textric
```

## Detailed Comparisons

### Textric vs Pretext

[Pretext](https://github.com/chenglou/pretext) is the best solution for browser-side text layout. Textric is its complement for everything outside the browser.

| | Pretext | Textric |
|--|---------|---------|
| **Designed for** | Browser performance | AI / server-side text layout |
| **Environment** | Browser only | Node.js / Bun / Deno / Edge |
| **Measurement engine** | Canvas `measureText()` | opentype.js `getAdvanceWidth()` |
| **"No DOM" meaning** | No DOM reflow (still needs Canvas API) | No browser APIs at all |
| **Font source** | Browser must have font loaded | Local files or in-memory buffers |
| **Native dependencies** | None (browser APIs) | None (pure JS) |
| **Multi-line** | Yes (BiDi, shrink wrap, variable width) | Yes (CJK + Latin, truncation, shrink wrap) |
| **Hot path speed** | ~0.09ms (pure arithmetic on cached widths) | ~0.1ms (glyph lookup + kerning) |

**They solve different problems.** Pretext eliminates DOM reflow in browsers. Textric enables text layout where there is no browser.

Pretext's `prepare()` requires Canvas API — confirmed in source (`measurement.ts:27-41`). Without a browser, it throws:
```
Error: Text measurement requires OffscreenCanvas or a DOM canvas context.
```

### Textric vs node-canvas

[node-canvas](https://github.com/Automattic/node-canvas) brings the full Canvas API to Node.js, including `measureText()`.

| | node-canvas | Textric |
|--|------------|---------|
| **Native deps** | Cairo + Pango + libjpeg + giflib | **None** |
| **Install** | Requires C++ build tools, system libraries | `npm install textric` |
| **Docker** | Need `apt-get install` for system libs | Just works |
| **Cloudflare Workers** | Not supported | **Works** |
| **AWS Lambda** | Needs custom layer for native libs | Just works |
| **CI/CD** | Needs build tools in CI image | Just works |
| **Multi-line** | Manual implementation | **Built-in** |

node-canvas is the right choice when you need the full Canvas 2D API (drawing shapes, images, etc.). Textric is better when you only need text layout and measurement.

### Textric vs Satori (@vercel/og)

[Satori](https://github.com/vercel/satori) renders JSX to SVG, primarily for OG image generation. It uses opentype.js internally — the same engine as Textric.

| | Satori | Textric |
|--|--------|---------|
| **Purpose** | JSX → SVG rendering | Text layout |
| **Input** | React JSX | Text string + font options |
| **Output** | SVG markup | Layout data (width, height, lines, fragments) |
| **Layout engine** | Yoga (full flexbox) | wrapText (text-only) |
| **Weight** | ~2MB + Yoga WASM | ~21KB (+ ~3.7MB opentype.js) |
| **Google Fonts** | Yes | No (bring your own fonts) |
| **Network I/O** | Yes | None |
| **Best for** | Generating images | Computing text layout metrics |

Satori is a rendering engine. Textric is a layout library. If you need to render an image, use Satori. If you need to know "does this text fit in a 280px box?", Textric is lighter and more direct.

### Textric vs Puppeteer / Playwright

| | Headless browser | Textric |
|--|-----------------|---------|
| **Startup** | ~2-5 seconds | ~10-50ms (font parse) |
| **Memory** | ~100-300MB | ~10-50MB |
| **Per measurement** | ~50-200ms | **< 0.1ms** |
| **Dependency size** | ~400MB (Chromium) | ~3.7MB |
| **Edge Runtime** | Not supported | **Works** |
| **Accuracy** | Perfect (real browser) | High (real font data + kerning) |

Headless browsers give perfect accuracy but at massive resource cost. Textric trades a tiny amount of accuracy for 1000x less overhead.

## When to Use What

| Scenario | Best choice | Why |
|----------|------------|-----|
| Browser real-time layout | **Pretext** | Fastest hot path, designed for browser |
| AI generating UI layouts | **Textric** | No browser in AI sandbox |
| AI generating slides/PDFs | **Textric** | Lightweight, batch measurement |
| OG image generation | **Satori** | Full JSX rendering |
| Need just text layout on server | **Textric** | Simplest API for the job |
| Full Canvas API on server | **node-canvas** | When you need more than text |
| Pixel-perfect screenshot | **Puppeteer** | When accuracy is everything |
| Cloudflare Workers / Edge | **Textric** | Only option with zero native deps |
| CI text overflow testing | **Textric** | Easy to install, fast, no network |
