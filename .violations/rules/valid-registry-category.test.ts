import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

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

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'violations-category-'))
})

after(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('dsl-ui/valid-registry-category', () => {
  it('has the expected id and severity', () => {
    assert.equal(rule.id, 'dsl-ui/valid-registry-category')
    assert.equal(rule.defaultSeverity, 'error')
  })

  for (const category of ['atomic', 'composite', 'disposition']) {
    it(`accepts ${category}`, async () => {
      assert.deepEqual(await rule.check([write(`Ok-${category}.tsx`, annotated(category))]), [])
    })
  }

  /*
   * The real case. Two components shipped with "layout" - a plausible word that is not a category -
   * and it only surfaced as a TypeScript error in a consuming app's generated registry.
   */
  it('rejects "layout", the one that actually happened', async () => {
    const found = await rule.check([write('Bad.tsx', annotated('layout'))])

    assert.equal(found.length, 1)
    assert.ok(found[0]!.message.includes('layout'))
    // Says which one to use, or the reader has to go and read the registry types.
    assert.ok(found[0]!.message.includes('disposition'))
  })

  it('rejects any other invented category', async () => {
    const found = await rule.check([write('Invented.tsx', annotated('widget'))])
    assert.equal(found.length, 1)
  })

  it('reports the line the annotation is on', async () => {
    const file = write('Line.tsx', `// a comment\n\n/**\n * ${TAG} nonsense\n */\n`)

    const found = await rule.check([file])

    assert.equal(found[0]!.line, 4)
  })

  it('ignores a file with no annotation at all', async () => {
    assert.deepEqual(await rule.check([write('Plain.tsx', 'export const x = 1\n')]), [])
  })

  it('reports every bad annotation in one file, not just the first', async () => {
    const file = write('Two.tsx', `${annotated('layout')}\n${annotated('widget')}`)

    assert.equal((await rule.check([file])).length, 2)
  })
})
