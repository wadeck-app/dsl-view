import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { rule } from './no-unexported-component.js'

/**
 * Exercises check() against fixture folders rather than asserting the rule's metadata: a rule
 * that reports nothing would satisfy an id-and-severity test while catching no defect.
 */

const ANNOTATION = `/**\n * @registry${''}Category atomic\n */`

let dir: string

function write(rel: string, content: string): string {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'violations-unexported-'))
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('dsl-ui/no-unexported-component', () => {
  it('has the expected id and severity', () => {
    expect(rule.id).toBe('dsl-ui/no-unexported-component')
    expect(rule.defaultSeverity).toBe('error')
  })

  it('reports an annotated component the barrel does not re-export', async () => {
    const file = write('controls/Checkbox.tsx', `${ANNOTATION}\nexport const Checkbox = 1\n`)
    write('controls/index.ts', `export * from './CheckboxGroup.js'\n`)

    const found = await rule.check([file])

    expect(found.length).toBe(1)
    expect(found[0]!.message).toMatch(/Checkbox/)
    // The message has to say what to add, or the reader has to guess the convention.
    expect(found[0]!.message).toMatch(/export \* from '\.\/Checkbox\.js'/)
  })

  it('accepts an annotated component the barrel re-exports', async () => {
    const file = write('display/Badge.tsx', `${ANNOTATION}\nexport function Badge() { return null }\n`)
    write('display/index.ts', `export * from './Badge.js'\n`)

    expect(await rule.check([file])).toEqual([])
  })

  // forwardRef components declare with const. Missing that form is what let the equivalent
  // package test pass while Checkbox was still unreachable.
  it('names a const-declared component in the message', async () => {
    const file = write('controls/Radio.tsx', `${ANNOTATION}\nexport const Radio = 1\n`)
    write('controls/index.ts', `export * from './RadioGroup.js'\n`)

    const found = await rule.check([file])

    expect(found.length).toBe(1)
    expect(found[0]!.message).toMatch(/Radio/)
  })

  it('ignores a component with no registry annotation', async () => {
    const file = write('utils/helper.tsx', `export const helper = 1\n`)
    write('utils/index.ts', `\n`)

    expect(await rule.check([file])).toEqual([])
  })

  it('ignores underscore-prefixed internals, tests and stories', async () => {
    write('controls/index.ts', `\n`)
    const files = [
      write('controls/_Button.tsx', `${ANNOTATION}\nexport function Button() { return null }\n`),
      write('controls/Thing.test.tsx', `${ANNOTATION}\nexport function Thing() { return null }\n`),
      write('controls/Thing.stories.tsx', `${ANNOTATION}\nexport function Thing() { return null }\n`),
    ]

    expect(await rule.check(files)).toEqual([])
  })

  // A folder with no barrel cannot re-export anything, which is the same defect in a worse form.
  it('reports an annotated component in a folder with no barrel', async () => {
    const file = write('orphan/Widget.tsx', `${ANNOTATION}\nexport function Widget() { return null }\n`)

    const found = await rule.check([file])

    expect(found.length).toBe(1)
    expect(found[0]!.message).toMatch(/does not exist/)
  })
})
