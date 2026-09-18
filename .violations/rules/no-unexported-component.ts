import type { Rule, Violation } from '@wadeck-app/violations-rules'
import fs from 'node:fs'
import path from 'node:path'

/**
 * A component annotated for the registry must be re-exported by its folder barrel.
 *
 * Checkbox and Radio both carried the annotation, so both were meant to be public, but the
 * controls barrel listed only CheckboxGroup and RadioGroup. A consumer needing a plain
 * checkbox could not import one and put a raw input in its place instead - and that is the
 * shape of most "the app hand-rolled it" findings: not a preference, a component that could
 * not be reached.
 *
 * A test in the package asserts the same thing at the package entry. This rule catches it at
 * the file that introduced it, and reports the exact barrel line to add.
 *
 * Files prefixed with _ are internal building blocks by convention and are skipped.
 */

const ANNOTATION = ['@registry', 'Category'].join('')

/** Names a component file exports, covering both declaration forms. */
function exportedComponents(src: string): string[] {
  return [
    ...[...src.matchAll(/^export function (\w+)/gm)].map(m => m[1]!),
    ...[...src.matchAll(/^export const (\w+)\s*[:=]/gm)].map(m => m[1]!),
  ]
}

export const rule: Rule = {
  id: 'dsl-ui/no-unexported-component',
  tags: 'ts',
  defaultScope: ['packages/dsl-ui/src/components/**/*.tsx'],
  defaultSeverity: 'error',

  async check(files: string[]): Promise<Violation[]> {
    const violations: Violation[] = []

    for (const file of files) {
      const base = path.basename(file)
      if (base.includes('.test.') || base.includes('.stories.') || base.startsWith('_')) {
        continue
      }

      let src: string
      try {
        src = fs.readFileSync(file, 'utf8')
      } catch {
        continue
      }
      if (!src.includes(ANNOTATION)) {
        continue
      }

      const barrel = path.join(path.dirname(file), 'index.ts')
      let barrelSrc: string
      try {
        barrelSrc = fs.readFileSync(barrel, 'utf8')
      } catch {
        // A folder holding an annotated component with no barrel cannot be re-exported at all.
        violations.push({
          file,
          line: 1,
          message: `${base} is annotated for the registry but ${path.relative(process.cwd(), barrel)} does not exist, so nothing can import it.`,
        })
        continue
      }

      const stem = base.replace(/\.tsx$/, '')
      // The barrel convention is `export * from './Name.js'`.
      const reExported = barrelSrc.includes(`'./${stem}.js'`)
      if (!reExported) {
        const names = exportedComponents(src)
        const named = names.length > 0 ? names.join(', ') : stem
        violations.push({
          file,
          line: 1,
          message: `${named} is annotated for the registry but not re-exported: add "export * from './${stem}.js';" to ${path.basename(path.dirname(file))}/index.ts, or consumers cannot import it.`,
        })
      }
    }

    return violations
  },
}
