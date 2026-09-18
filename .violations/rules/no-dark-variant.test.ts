import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { rule } from './no-dark-variant.js'

/**
 * Exercises check() against fixture files. The rule guards a property that is invisible in a single
 * component and only shows up when one is nested inside a scope of the other theme, so a test that
 * only checked the rule's id would be worth nothing.
 */

let dir: string

function write(name: string, content: string): string {
  const full = path.join(dir, name)
  fs.writeFileSync(full, content)
  return full
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'violations-dark-'))
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('dsl-ui/no-dark-variant', () => {
  it('has the expected id and severity', () => {
    expect(rule.id).toBe('dsl-ui/no-dark-variant')
    expect(rule.defaultSeverity).toBe('error')
  })

  // The exact shape that kept a chip dark inside a light scope.
  it('reports a dark: variant in a class string', async () => {
    const file = write('Chip.tsx', `const cls = 'bg-gray-100 dark:bg-gray-700'\n`)

    const found = await rule.check([file])

    expect(found.length).toBe(1)
    expect(found[0]!.message).toContain('dark:bg-gray-700')
    // Names the alternative, or the reader is told off without being told what to do.
    expect(found[0]!.message).toMatch(/bg-muted-bg|semantic token/)
  })

  it('accepts the token equivalent', async () => {
    expect(await rule.check([write('Tokens.tsx', `const cls = 'bg-muted-bg text-content'\n`)])).toEqual([])
  })

  /*
   * The word "dark" on its own is the SCOPE class ThemeScope applies deliberately. Flagging that
   * would make the rule fight the very component it exists to protect.
   */
  it('does not report the bare scope class', async () => {
    const file = write('Scope.tsx', `const cls = \`\${theme} bg-bg text-content\`\nconst d = 'dark'\n`)

    expect(await rule.check([file])).toEqual([])
  })

  /*
   * The rule's first version flagged its own documentation: explaining why a component stopped using
   * `dark:bg-gray-700` naturally quotes it, and Skeleton's comment was reported as a violation. A
   * lint that punishes writing down the reason teaches people not to write it down.
   */
  it('does not report a variant merely mentioned in a comment', async () => {
    const file = write('Documented.tsx', [
      '/*',
      ' * Uses the token, not `dark:bg-gray-700`: a dark: variant keys off any .dark ancestor.',
      ' */',
      `const cls = 'bg-muted-bg'  // was dark:bg-gray-700`,
      '',
    ].join('\n'))

    expect(await rule.check([file])).toEqual([])
  })

  it('still reports real code on a line that also carries a comment', async () => {
    const file = write('Mixed.tsx', `const cls = 'dark:bg-gray-700'  // intentional\n`)

    expect((await rule.check([file])).length).toBe(1)
  })

  // Blanking comments must not shift the reported position.
  it('keeps line numbers correct after blanking comments', async () => {
    const file = write('Offset.tsx', [
      '/* a',
      '   multi-line',
      '   comment */',
      `const cls = 'dark:text-white'`,
      '',
    ].join('\n'))

    expect((await rule.check([file]))[0]!.line).toBe(4)
  })

  it('reports each occurrence on its own line', async () => {
    const file = write('Many.tsx', `const a = 'dark:text-white'\nconst b = 'ok'\nconst c = 'dark:border-gray-600'\n`)

    const found = await rule.check([file])

    expect(found.length).toBe(2)
    expect(found.map(v => v.line)).toEqual([1, 3])
  })

  // Stories demonstrate theming on purpose, including a dark wrapper to show a subtree.
  it('ignores stories and tests', async () => {
    const story = write('Thing.stories.tsx', `const cls = 'dark:bg-gray-700'\n`)
    const test = write('Thing.test.tsx', `const cls = 'dark:bg-gray-700'\n`)

    expect(await rule.check([story, test])).toEqual([])
  })

  /*
   * No file is exempt any more. Four were grandfathered when the rule landed, because their per-hue
   * tints had no token equivalent; the --color-hue-* tokens now exist and all four use them.
   *
   * Asserted explicitly, because an exemption list is the kind of thing that quietly outlives its
   * reason - and the files it named are exactly the ones a future change would put back.
   */
  it('exempts no file, including the four that were once grandfathered', async () => {
    const files = ['chipColors.ts', 'HttpMethodBadge.tsx', 'HttpStatusBadge.tsx', 'ColorPicker.tsx']
      .map(name => write(name, `const cls = 'text-blue-600 dark:text-blue-400'\n`))

    expect((await rule.check(files)).length).toBe(4)
  })
})
