# Performance Guide

## Performance Characteristics

### Latency Breakdown

| Operation | Time | Frequency |
|-----------|------|-----------|
| Local font file read | ~1-5ms | Once per font variant |
| opentype.js parse | ~10-50ms | Once per font variant (cached in memory) |
| `getAdvanceWidth()` | ~0.01-0.05ms | Per measurement call |
| `wrapText()` multi-line | ~1-3ms | Per multi-line measurement |

### Real-world Scenarios (font cached in memory)

| Scenario | Time |
|----------|------|
| Single line, short text | **< 0.1ms** |
| Single line, 100 chars | **~0.1ms** |
| Multi-line 500 chars, CJK | **~3ms** |
| Multi-line 500 chars, Latin | **~2ms** |
| Batch 100 texts, same font | **~20-30ms** |

## Optimization Tips

### 1. Pre-load fonts at startup

```typescript
// Do this once at app startup, not per-request
const m = await createMeasurer({
  fonts: [
    { family: 'Inter', path: './fonts/Inter-Regular.ttf' },
    { family: 'Inter', path: './fonts/Inter-Bold.ttf', weight: 700 },
  ]
})

// Reuse the measurer instance for all measurements
export { m }
```

### 2. Use batch measurement

```typescript
// Slower: individual calls
for (const text of texts) {
  m.measure(text, { font: 'Inter', size: 14 })
}

// Faster: batch call
m.measureBatch(texts.map(text => ({ text, font: 'Inter', size: 14 })))
```

### 3. Pre-bundle fonts in Docker

```dockerfile
# Bundle fonts at build time
COPY fonts/ /app/fonts/
```

Load from local paths for fastest startup.

### 4. Reuse measurer instances

The measurer caches parsed font objects in memory. Creating a new measurer means re-parsing fonts.

```typescript
// Bad: new measurer per request
app.get('/measure', async (req, res) => {
  const m = await createMeasurer({ ... })  // re-parses fonts every time!
  res.json(m.measure(req.query.text, { ... }))
})

// Good: shared measurer
const m = await createMeasurer({ ... })
app.get('/measure', (req, res) => {
  res.json(m.measure(req.query.text, { ... }))  // uses cached font
})
```

## How Textric Compares

### vs DOM reflow (traditional)
- **100-500x faster** for repeated measurements (no reflow)
- But requires font loading upfront

### vs Pretext
Different tradeoff — not directly comparable:
- Pretext `layout()` is faster (~0.09ms) because it pre-computes all segment widths in `prepare()`
- Textric computes per-call, but runs in Node.js where Pretext can't
- For server-side use, Textric is the only option that doesn't require native deps

### vs node-canvas
- **No native dependencies** — no Cairo/Pango installation
- Similar measurement accuracy (both use real font data)
- Textric works on Edge Runtime, node-canvas doesn't

## Known Limitations

1. **First measurement per font variant is slow** (~10-50ms for parsing). Mitigate by pre-loading at startup.
2. **CJK multi-line wrapping measures per-character.** For 1000+ character texts, this can take 5-10ms. We're working on segment-level batching to improve this.
3. **Memory usage grows with cached fonts.** Default LRU limit is 100 font variants. Adjust if needed.
