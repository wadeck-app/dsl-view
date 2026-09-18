import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { rule } from './valid-registry-category.js'

/**
 * Exercises check() against fixture files rather than asserting the rule's metadata: a rule that
 * reports nothing would satisfy an id-and-severity test while catching no defect.
 */

// Assembled so this test file does not contain a real annotation for the generator to find.
const TAG = ['@registry', 'Category'].join('')

let dir: string

function write(name: string, content: string): string {
  const full = path.join(dir, name)
  fs.writeFileSync(full, content)
  return full
}

function annotated(category: string): string {
  return `/**\n * ${TAG} ${category}\n */\nexport function Thing() { return null }\n`
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'violations-category-'))
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('dsl-ui/valid-registry-category', () => {
  it('has the expected id and severity', () => {
    expect(rule.id).toBe('dsl-ui/valid-registry-category')
    expect(rule.defaultSeverity).toBe('error')
  })

  it.each(['atomic', 'composite', 'disposition'])('accepts %s', async category => {
    expect(await rule.check([write(`Ok-${category}.tsx`, annotated(category))])).toEqual([])
  })

  /*
   * The real case. Two components shipped with "layout" - a plausible word that is not a category -
   * and it only surfaced as a TypeScript error in a consuming app's generated registry.
   */
  it('rejects "layout", the one that actually happened', async () => {
    const found = await rule.check([write('Bad.tsx', annotated('layout'))])

    expect(found.length).toBe(1)
    expect(found[0]!.message).toContain('layout')
    // Says which one to use, or the reader has to go and read the registry types.
    expect(found[0]!.message).toContain('disposition')
  })

  it('rejects any other invented category', async () => {
    const found = await rule.check([write('Invented.tsx', annotated('widget'))])
    expect(found.length).toBe(1)
  })

  it('reports the line the annotation is on', async () => {
    const file = write('Line.tsx', `// a comment\n\n/**\n * ${TAG} nonsense\n */\n`)

    const found = await rule.check([file])

    expect(found[0]!.line).toBe(4)
  })

  it('ignores a file with no annotation at all', async () => {
    expect(await rule.check([write('Plain.tsx', 'export const x = 1\n')])).toEqual([])
  })

  it('reports every bad annotation in one file, not just the first', async () => {
    const file = write('Two.tsx', `${annotated('layout')}\n${annotated('widget')}`)

    expect((await rule.check([file])).length).toBe(2)
  })
})
