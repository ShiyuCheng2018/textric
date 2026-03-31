import { createMeasurer } from 'textric'

async function main() {
  const m = await createMeasurer({
    fonts: [
      { family: 'Inter', path: './fonts/Inter-Regular.ttf', weight: 400 },
      { family: 'Inter', path: './fonts/Inter-Bold.ttf', weight: 700 },
    ],
  })

  // --- Price tag with mixed sizes ---
  console.log('=== Price Tag ===')
  const price = m.measureRichText([
    { text: '$', font: 'Inter', size: 14, weight: 400 },
    { text: '49', font: 'Inter', size: 32, weight: 700 },
    { text: '.99', font: 'Inter', size: 14, weight: 400 },
  ])
  console.log(`Price tag: ${price.width}px x ${price.height}px`)
  for (const frag of price.lines[0].fragments) {
    console.log(`  "${frag.text}" at x=${frag.x}, width=${frag.width}, size=${frag.size}`)
  }

  // --- Paragraph with inline bold, wrapped ---
  console.log('\n=== Styled Paragraph ===')
  const paragraph = m.measureRichText(
    [
      { text: 'Your subscription ', font: 'Inter', size: 14, weight: 400 },
      { text: 'Pro Annual', font: 'Inter', size: 14, weight: 700 },
      { text: ' has been renewed. The next billing date is ', font: 'Inter', size: 14, weight: 400 },
      { text: 'April 30, 2026', font: 'Inter', size: 14, weight: 700 },
      { text: '.', font: 'Inter', size: 14, weight: 400 },
    ],
    { maxWidth: 280, lineHeight: 1.5 },
  )
  console.log(`Lines: ${paragraph.lineCount}, Size: ${paragraph.width}px x ${paragraph.height}px`)
  for (const line of paragraph.lines) {
    const text = line.fragments.map((f) => f.text).join('')
    console.log(`  Line at y=${line.y}: "${text}"`)
  }

  // --- Truncation with maxLines ---
  console.log('\n=== Truncated Rich Text ===')
  const truncated = m.measureRichText(
    [
      { text: 'Important: ', font: 'Inter', size: 14, weight: 700 },
      { text: 'This is a very long notification message that explains the details of the system update. It contains multiple sentences and should be truncated to fit within the allowed space.', font: 'Inter', size: 14, weight: 400 },
    ],
    { maxWidth: 250, lineHeight: 1.4, maxLines: 2 },
  )
  console.log(`Truncated: ${truncated.truncated}`)
  console.log(`Showing ${truncated.lineCount} of ${truncated.totalLineCount} lines`)

  // --- SVG rendering example ---
  console.log('\n=== SVG Output ===')
  const heading = m.measureRichText([
    { text: 'Dashboard ', font: 'Inter', size: 24, weight: 700 },
    { text: '/ Analytics', font: 'Inter', size: 24, weight: 400 },
  ])
  const tspans = heading.lines[0].fragments.map((frag) => {
    const weight = frag.weight >= 700 ? 'bold' : 'normal'
    return `<tspan x="${frag.x}" font-weight="${weight}" font-size="${frag.size}">${frag.text}</tspan>`
  })
  console.log(`<svg viewBox="0 0 ${Math.ceil(heading.width)} ${Math.ceil(heading.height)}">`)
  console.log(`  <text y="${heading.lines[0].baseline}">${tspans.join('')}</text>`)
  console.log(`</svg>`)
}

main()
