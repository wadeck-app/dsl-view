import type { ViolationsConfig } from '@wadeck-app/violations-rules'

export default {
  projectTags: ['ts', 'react', 'tailwind'],
  globalExclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/storybook-static/**',
    '**/*.tsbuildinfo',
  ],
  rules: {
    // Test files use raw HTML elements as minimal fixtures — not production UI
    'react/no-raw-button': { $exclude: ['**/*.test.tsx', '**/*.test.ts'] },
    'react/no-raw-input':  { $exclude: ['**/*.test.tsx', '**/*.test.ts'] },
    // Test/story files may use inline SVGs as fixtures (rule fix in source, pending package release)
    'react/no-inline-svg': { $exclude: ['**/*.test.tsx', '**/*.stories.tsx'] },
    // dsl-renderer engine processes DSL node shapes as unknown at runtime — casts are unavoidable
    'ts/no-unsafe-type-cast': { $exclude: ['packages/dsl-renderer/**'] },
    // A component annotated for the registry that no barrel re-exports cannot be imported at
    // all. Checkbox and Radio were both in that state, which is why a consumer put raw inputs
    // in their place.
    './.violations/rules/no-unexported-component.ts': true,
    // An invented category compiles fine here and fails as a type error in a CONSUMING app's
    // generated registry. Two components shipped with "layout", which is not a category.
    './.violations/rules/valid-registry-category.ts': true,
    // A dark: variant applies under ANY .dark ancestor, so a component using one cannot be nested
    // inside a ThemeScope that re-asserts light. Tokens resolve against the nearest scope instead.
    './.violations/rules/no-dark-variant.ts': true,
  },
} satisfies ViolationsConfig
