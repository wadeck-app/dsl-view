import type { ViolationsConfig } from '@wadeck-app/violations-rules'

export default {
  projectTags: ['ts', 'react', 'tailwind'],
  globalExclude: [
    '**/node_modules/**',
    '**/dist/**',
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
  },
} satisfies ViolationsConfig
