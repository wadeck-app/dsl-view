import type { Rule, Violation } from '@wadeck-app/violations-rules'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Every component declared for the registry must be named in the component inventory.
 *
 * The inventory is the one page an agent building an app reads to learn which components exist and
 * which to pick. A component missing from it is, for that agent, a component that does not exist:
 * it hand-rolls the thing instead (the same failure no-unexported-component guards at the barrel).
 *
 * "Named" means the exact component name in backticks, as in `Checkbox`. A bare word would be
 * satisfied by prose ("a card layout") and prove nothing.
 *
 * Files prefixed with _ are internal building blocks and are skipped.
 */

export type Config = {
  /** Inventory path, relative to the directory the check runs from. */
  inventory?: string
}

const DEFAULT_INVENTORY = '.claude/docs/inventory.md'

const ANNOTATION = ['@registry', 'Category'].join('')

/**
 * The component a real annotation documents: the export directly after the doc block holding it.
 * It must be a tag at the start of a doc line followed by a category: prose that merely mentions
 * it ("carries no <annotation> here"), even above an export, does not count.
 */
function annotatedExport(src: string): { name: string; line: number } | undefined {
  const pattern = new RegExp(
    `/\\*\\*(?:(?!\\*/)[\\s\\S])*?\\n[ \\t]*\\*[ \\t]*${ANNOTATION}[ \\t]+\\w+(?:(?!\\*/)[\\s\\S])*?\\*/\\s*\\n\\s*export (?:default )?(?:function|const) (\\w+)`,
  )
  const match = pattern.exec(src)
  if (!match) {
    return undefined
  }
  const line = src.slice(0, match.index + match[0].lastIndexOf('export')).split('\n').length
  return { name: match[1]!, line }
}

/** Nearest ancestor of `file` containing `.violations/config.ts` (a bare .violations dir can be a stray cache), if any. */
function projectRoot(file: string | undefined): string | undefined {
  if (!file) {
    return undefined
  }
  let dir = path.dirname(path.resolve(file))
  while (true) {
    if (fs.existsSync(path.join(dir, '.violations', 'config.ts'))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return undefined
    }
    dir = parent
  }
}

export const rule: Rule<Config> = {
  id: 'dsl-ui/component-in-inventory',
  tags: 'ts',
  defaultScope: ['packages/dsl-ui/src/components/**/*.tsx'],
  defaultSeverity: 'error',

  async check(files: string[], config: Config): Promise<Violation[]> {
    const violations: Violation[] = []
    const inventoryRel = config.inventory ?? DEFAULT_INVENTORY
    // check() receives no project root, and the cwd is the invocation directory, not necessarily
    // the root. An absolute inventory path is used as is; a relative one is resolved from the
    // nearest ancestor of the checked files that holds .violations/config.ts.
    const inventoryPath = path.isAbsolute(inventoryRel)
      ? inventoryRel
      : path.join(projectRoot(files[0]) ?? process.cwd(), inventoryRel)

    let inventory: string
    try {
      inventory = fs.readFileSync(inventoryPath, 'utf8')
    } catch {
      // Reported once per run, on the first file, so the cause is not buried under one violation
      // per component.
      return files.length === 0
        ? []
        : [{
            file: files[0]!,
            line: 1,
            message: `Component inventory not found at ${inventoryPath}. Create it, or point the rule at it with { inventory: '<path>' } in .violations/config.ts.`,
          }]
    }

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
      const component = annotatedExport(src)
      if (!component) {
        continue
      }
      if (!inventory.includes('`' + component.name + '`')) {
        violations.push({
          file,
          line: component.line,
          message: `${component.name} is declared for the registry but not in ${inventoryRel}: add a row naming \`${component.name}\` (what it is, when to use it over a sibling), or agents consuming the library will not know it exists.`,
        })
      }
    }

    return violations
  },
}
export default rule
