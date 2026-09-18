import type { Rule, Violation } from '@wadeck-app/violations-rules'
import fs from 'node:fs'
import path from 'node:path'

/**
 * A component must not style itself with Tailwind `dark:` variants. It uses semantic tokens.
 *
 * This is what makes ThemeScope work, and it is not a style preference.
 *
 * The dark variant is configured as a DESCENDANT selector - `&:is(.dark *)` - so it applies to
 * anything beneath ANY `.dark` ancestor, however far up. A ThemeScope that re-asserts light inside a
 * dark app therefore flips the tokens and the colour-scheme but cannot flip a `dark:` variant: the
 * outer `.dark` is still an ancestor. Measured on the chip active fill, which stayed rgb(55,65,81)
 * on a light panel.
 *
 * It cannot be fixed in the selector either. Excluding `.light` descendants would then break the
 * mirror case, dark nested inside light, and CSS has no way to express "the nearest ancestor wins"
 * for a variant. Tokens do exactly that for free, because custom properties inherit.
 *
 * So: any `dark:` in a component is a component that cannot be nested. Tokens (`bg-surface`,
 * `text-content`, `border-border`, `bg-muted-bg`, `text-muted`) carry both themes by themselves.
 */

/**
 * Blanks comments while keeping every line and column, so a line number still points at the right
 * place.
 *
 * Needed because the explanation of WHY a component stopped using a dark variant naturally quotes
 * the variant it removed - and the first version of this rule flagged its own documentation. A lint
 * that punishes writing down the reason teaches people not to write it down.
 */
function withoutComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, block => block.replace(/[^\n]/g, ' '))
  out = out.replace(/\/\/[^\n]*/g, line => ' '.repeat(line.length))
  return out
}

/*
 * No exceptions.
 *
 * Four files were grandfathered when this rule landed - chipColors and the two HTTP badges, whose
 * per-hue tints had no token equivalent, and ColorPicker's selection ring. The tokens now exist
 * (--color-hue-*), all four use them, and the list is gone. Adding one back means adding a token
 * instead.
 */

export const rule: Rule = {
  id: 'dsl-ui/no-dark-variant',
  tags: ['ts', 'tailwind'],
  defaultScope: ['packages/dsl-ui/src/**/*.{ts,tsx}'],
  defaultSeverity: 'error',

  async check(files: string[]): Promise<Violation[]> {
    const violations: Violation[] = []

    for (const file of files) {
      const base = path.basename(file)
      // Stories demonstrate theming ON PURPOSE, including a `dark` wrapper to show a subtree.
      if (base.includes('.stories.') || base.includes('.test.')) {
        continue
      }
      let src: string
      try {
        src = fs.readFileSync(file, 'utf8')
      } catch {
        continue
      }

      withoutComments(src).split('\n').forEach((text, index) => {
        // Inside a class string: `dark:bg-gray-700`. Not `dark` on its own, which is the scope class
        // ThemeScope applies deliberately.
        const match = /\bdark:[\w[\]/.-]+/.exec(text)
        if (!match) {
          return
        }
        violations.push({
          file,
          line: index + 1,
          message:
            `"${match[0]}" makes this component impossible to nest: a dark: variant applies under ANY` +
            ` .dark ancestor, so it keeps its dark styling inside a ThemeScope that re-asserts light.` +
            ` Use a semantic token instead (bg-surface, bg-muted-bg, text-content, text-muted,` +
            ` border-border), which resolves against the nearest scope.`,
        })
      })
    }

    return violations
  },
}
