import { createMeasurer } from 'textric'

async function main() {
  // Create a measurer with Inter font from Google Fonts
  const m = await createMeasurer({
    fonts: [{ family: 'Inter', path: './fonts/Inter-Regular.ttf', weight: 400 }],
  })

  // Single-line measurement
  const result = m.measure('Hello World', { font: 'Inter', size: 16 })
  console.log(`Width: ${result.width}px`)
  console.log(`Height: ${result.height}px`)

  // Multi-line measurement
  const multiline = m.measure(
    'This is a longer text that will automatically wrap into multiple lines within the specified container width.',
    {
      font: 'Inter',
      size: 14,
      maxWidth: 300,
      lineHeight: 1.5,
    },
  )
  console.log(`Lines: ${multiline.lineCount}`)
  console.log(`Height: ${multiline.height}px`)
  console.log(`Truncated: ${multiline.truncated}`)

  // Truncation detection
  const truncated = m.measure(
    'Very long text '.repeat(50),
    {
      font: 'Inter',
      size: 14,
      maxWidth: 300,
      maxLines: 3,
    },
  )
  console.log(`Showing ${truncated.lineCount} of ${truncated.totalLineCount} lines`)
}

main()
