import { resolve } from 'path'
import opentype from 'opentype.js'

const REGULAR_PATH = resolve('test/fixtures/fonts/Inter-Regular.ttf')
const BOLD_PATH = resolve('test/fixtures/fonts/Inter-Bold.ttf')

async function generate() {
  const regular = await opentype.load(REGULAR_PATH)
  const bold = await opentype.load(BOLD_PATH)

  const values: Record<string, number> = {}

  const cases: Array<{ key: string; font: opentype.Font; text: string; size: number }> = [
    // Single words / phrases used across tests
    { key: 'Inter-Regular-16-Hello', font: regular, text: 'Hello', size: 16 },
    { key: 'Inter-Regular-16-HelloWorld', font: regular, text: 'Hello World', size: 16 },
    { key: 'Inter-Regular-14-HelloWorld', font: regular, text: 'Hello World', size: 14 },
    { key: 'Inter-Regular-16-Hi', font: regular, text: 'Hi', size: 16 },
    { key: 'Inter-Regular-16-Test', font: regular, text: 'Test', size: 16 },
    { key: 'Inter-Regular-16-World', font: regular, text: 'World', size: 16 },
    { key: 'Inter-Regular-14-Textric', font: regular, text: 'Textric', size: 14 },
    { key: 'Inter-Regular-24-Textric', font: regular, text: 'Textric', size: 24 },

    // Bold variants
    { key: 'Inter-Bold-16-Hello', font: bold, text: 'Hello', size: 16 },
    { key: 'Inter-Bold-16-HelloWorld', font: bold, text: 'Hello World', size: 16 },

    // Rich text fragments
    { key: 'Inter-Regular-16-AB', font: regular, text: 'AB', size: 16 },
    { key: 'Inter-Bold-16-CD', font: bold, text: 'CD', size: 16 },
    { key: 'Inter-Bold-32-$12', font: bold, text: '$12', size: 32 },
    { key: 'Inter-Regular-14-/month', font: regular, text: '/month', size: 14 },

    // $49.99 price tag
    { key: 'Inter-Regular-14-$', font: regular, text: '$', size: 14 },
    { key: 'Inter-Bold-32-49', font: bold, text: '49', size: 32 },
    { key: 'Inter-Regular-14-.99', font: regular, text: '.99', size: 14 },

    // Dynamic line height test
    { key: 'Inter-Bold-24-Title', font: bold, text: 'Title', size: 24 },
    { key: 'Inter-Regular-12-Bodytexthere', font: regular, text: 'Body text here', size: 12 },
  ]

  for (const c of cases) {
    values[c.key] = c.font.getAdvanceWidth(c.text, c.size)
  }

  // Font metrics at 16px
  const scale16 = 16 / regular.unitsPerEm
  values['Inter-Regular-16-ascent'] = regular.ascender * scale16
  values['Inter-Regular-16-descent'] = Math.abs(regular.descender) * scale16

  console.log(JSON.stringify(values, null, 2))
}

generate()
