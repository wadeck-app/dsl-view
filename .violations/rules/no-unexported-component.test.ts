import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { rule } from './no-unexported-component.js'

/**
 * Exercises check() against fixture folders rather than asserting the rule's metadata: a rule
 * that reports nothing would satisfy an id-and-severity test while catching no defect.
 */

const ANNOTATION = `/**\n * @registry${''}Category atomic\n */`

// Built piecewise: `violations test` rewrites a quoted './<x>.js' literal as an import specifier, even
// inside a template string.
function barrel(name: string): string {
  return `export * from '${'.'}/${name}.js'\n`
}

let dir: string

function write(rel: string, content: string): string {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'violations-unexported-'))
})

after(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('dsl-ui/no-unexported-component', () => {
  it('has the expected id and severity', () => {
    assert.equal(rule.id, 'dsl-ui/no-unexported-component')
    assert.equal(rule.defaultSeverity, 'error')
  })

  it('reports an annotated component the barrel does not re-export', async () => {
    const file = write('controls/Checkbox.tsx', `${ANNOTATION}\nexport const Checkbox = 1\n`)
    write('controls/index.ts', barrel('CheckboxGroup'))

    const found = await rule.check([file])

    assert.equal(found.length, 1)
    assert.match(found[0]!.message, /Checkbox/)
    // The message has to say what to add, or the reader has to guess the convention.
    assert.match(found[0]!.message, /export \* from '\.\/Checkbox\.js'/)
  })

  it('accepts an annotated component the barrel re-exports', async () => {
    const file = write('display/Badge.tsx', `${ANNOTATION}\nexport function Badge() { return null }\n`)
    write('display/index.ts', barrel('Badge'))

    assert.deepEqual(await rule.check([file]), [])
  })

  // forwardRef components declare with const. Missing that form is what let the equivalent
  // package test pass while Checkbox was still unreachable.
  it('names a const-declared component in the message', async () => {
    const file = write('controls/Radio.tsx', `${ANNOTATION}\nexport const Radio = 1\n`)
    write('controls/index.ts', barrel('RadioGroup'))

    const found = await rule.check([file])

    assert.equal(found.length, 1)
    assert.match(found[0]!.message, /Radio/)
  })

  it('ignores a component with no registry annotation', async () => {
    const file = write('utils/helper.tsx', `export const helper = 1\n`)
    write('utils/index.ts', `\n`)

    assert.deepEqual(await rule.check([file]), [])
  })

  it('ignores underscore-prefixed internals, tests and stories', async () => {
    write('controls/index.ts', `\n`)
    const files = [
      write('controls/_Button.tsx', `${ANNOTATION}\nexport function Button() { return null }\n`),
      write('controls/Thing.test.tsx', `${ANNOTATION}\nexport function Thing() { return null }\n`),
      write('controls/Thing.stories.tsx', `${ANNOTATION}\nexport function Thing() { return null }\n`),
    ]

    assert.deepEqual(await rule.check(files), [])
  })

  // A folder with no barrel cannot re-export anything, which is the same defect in a worse form.
  it('reports an annotated component in a folder with no barrel', async () => {
    const file = write('orphan/Widget.tsx', `${ANNOTATION}\nexport function Widget() { return null }\n`)

    const found = await rule.check([file])

    assert.equal(found.length, 1)
    assert.match(found[0]!.message, /does not exist/)
  })
})
