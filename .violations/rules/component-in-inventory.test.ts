import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { rule } from './component-in-inventory.js'

/**
 * Exercises check() against fixture folders: a rule that reports nothing would satisfy an
 * id-and-severity test while catching no defect.
 *
 * node:test, not vitest: `violations test` runs `node --test` on the compiled file.
 */

const ANNOTATION = `/**\n * @registry${''}Category atomic\n */`

let dir: string
let inventory: string

function write(rel: string, content: string): string {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'violations-inventory-'))
  inventory = write('inventory.md', '| `Badge` | status pill |\nA card layout is described here.\n')
})

after(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('dsl-ui/component-in-inventory', () => {
  it('has the expected id and severity', () => {
    assert.equal(rule.id, 'dsl-ui/component-in-inventory')
    assert.equal(rule.defaultSeverity, 'error')
  })

  it('accepts a component named in backticks', async () => {
    const file = write('Badge.tsx', `${ANNOTATION}\nexport function Badge() { return null }\n`)

    assert.deepEqual(await rule.check([file], { inventory }), [])
  })

  it('reports a component the inventory does not name, with the line of its export', async () => {
    const file = write('Radio.tsx', `import x from 'y'\n${ANNOTATION}\nexport const Radio = 1\n`)

    const found = await rule.check([file], { inventory })

    assert.equal(found.length, 1)
    assert.equal(found[0]!.line, 5)
    assert.match(found[0]!.message, /Radio/)
    // The message has to say what to write, or the reader has to guess the convention.
    assert.match(found[0]!.message, /`Radio`/)
  })

  // Prose containing the word must not count, or the check passes for the wrong reason.
  it('does not accept a bare word in prose', async () => {
    const file = write('Card.tsx', `${ANNOTATION}\nexport function Card() { return null }\n`)

    assert.equal((await rule.check([file], { inventory })).length, 1)
  })

  it('does not accept a longer name that merely contains the component name', async () => {
    const file = write('Bad.tsx', `${ANNOTATION}\nexport function Bad() { return null }\n`)
    const inv = write('inv2.md', '`Badge`\n')

    assert.equal((await rule.check([file], { inventory: inv })).length, 1)
  })

  it('ignores prose that mentions the annotation without declaring a component', async () => {
    const file = write('Page.tsx', `/**\n * Carries no @registry${''}Category on purpose.\n */\nexport function Page() { return null }\n`)

    assert.deepEqual(await rule.check([file], { inventory }), [])
  })

  it('skips internal, test and story files', async () => {
    const a = write('_Button.tsx', `${ANNOTATION}\nexport function Missing1() { return null }\n`)
    const b = write('X.test.tsx', `${ANNOTATION}\nexport function Missing2() { return null }\n`)
    const c = write('X.stories.tsx', `${ANNOTATION}\nexport function Missing3() { return null }\n`)

    assert.deepEqual(await rule.check([a, b, c], { inventory }), [])
  })

  it('fails loudly when the inventory file does not exist', async () => {
    const file = write('Badge2.tsx', `${ANNOTATION}\nexport function Badge2() { return null }\n`)

    const found = await rule.check([file], { inventory: path.join(dir, 'nope.md') })

    assert.equal(found.length, 1)
    assert.match(found[0]!.message, /inventory not found/i)
    assert.match(found[0]!.message, /nope\.md/)
  })

  // The default path must resolve from the project root, not from wherever the CLI was launched.
  it('finds the default inventory from the project root, whatever the cwd', async () => {
    write('proj/.violations/config.ts', '')
    write('proj/.claude/docs/inventory.md', '`Chip`\n')
    const file = write('proj/packages/ui/Chip.tsx', `${ANNOTATION}\nexport function Chip() { return null }\n`)
    const missing = write('proj/packages/ui/Gone.tsx', `${ANNOTATION}\nexport function Gone() { return null }\n`)

    const found = await rule.check([file, missing], {})

    assert.equal(found.length, 1)
    assert.match(found[0]!.message, /Gone/)
  })
})
