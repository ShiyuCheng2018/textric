---
name: Bug report
about: Report incorrect measurement results or unexpected behavior
title: ''
labels: bug
assignees: ''
---

**Describe the bug**
A clear description of what's wrong.

**To reproduce**
```typescript
import { createMeasurer } from 'textric'

const m = await createMeasurer({
  fonts: [{ family: '...', weight: ... }]
})

const result = m.measure('...', { font: '...', size: ... })
// Expected: { width: ..., height: ... }
// Actual: { width: ..., height: ... }
```

**Environment**
- Textric version:
- Node.js version:
- OS:
- Font used:

**Additional context**
If this is a measurement accuracy issue, please include:
- The expected width/height (e.g., from browser measurement)
- The actual width/height from Textric
- The font file if it's a custom font
