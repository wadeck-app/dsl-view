import type { Rule, Violation } from '@wadeck-app/violations-rules'
import fs from 'node:fs'
import path from 'node:path'

/**
 * A registry category annotation must name one of the categories the registry actually has.
 *
 * The generator copies the value straight into the generated entry as a typed literal, so an
 * invented one does not fail here - it fails later, as a TypeScript error in a CONSUMING app's
 * build, pointing at a generated file nobody wrote:
 *
 *   src/generated/entries.tsx(1077,22): error TS2322:
 *   Type '"layout"' is not assignable to type '"atomic" | "composite" | "disposition"'
 *
 * Two components shipped with `@registryCategory layout` - a plausible word that simply is not a
 * category - and that is exactly how it was discovered. The annotation is prose as far as this
 * package is concerned, and prose is not type-checked, so the check has to be a lint.
 *
 * "disposition" is the one for layout and arrangement components, which is the trap: "layout" reads
 * like the obvious choice and the folder is even called layout.
 */

// Assembled so this file does not contain the annotation it looks for - the generator scans sources
// for it, and a literal here would be read as a real annotation.
const ANNOTATION = ['@registry', 'Category'].join('')

/** The categories ComponentRegistryEntry accepts. */
const VALID = ['atomic', 'composite', 'disposition'] as const

export const rule: Rule = {
  id: 'dsl-ui/valid-registry-category',
  tags: 'ts',
  defaultScope: ['packages/dsl-ui/src/**/*.tsx', 'packages/dsl-renderer/src/**/*.tsx'],
  defaultSeverity: 'error',

  async check(files: string[]): Promise<Violation[]> {
    const violations: Violation[] = []

    for (const file of files) {
      let src: string
      try {
        src = fs.readFileSync(file, 'utf8')
      } catch {
        continue
      }

      const lines = src.split('\n')
      lines.forEach((text, index) => {
        const match = new RegExp(`${ANNOTATION}\\s+(\\S+)`).exec(text)
        if (!match) {
          return
        }
        const category = match[1]!
        if ((VALID as readonly string[]).includes(category)) {
          return
        }
        const hint = category === 'layout'
          ? ' Layout and arrangement components use "disposition".'
          : ''
        violations.push({
          file,
          line: index + 1,
          message:
            `"${category}" is not a registry category. Use one of: ${VALID.join(', ')}.${hint}` +
            ` Left as it is, this only fails when a consuming app compiles its generated registry,` +
            ` as a type error in ${path.basename(file)}'s generated entry.`,
        })
      })
    }

    return violations
  },
}
