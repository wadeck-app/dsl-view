import type { ViolationsConfig } from '@wadeck-app/violations-rules'

export default {
  projectTags: ['ts', 'react', 'tailwind'],
  globalExclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.tsbuildinfo',
  ],
  rules: {},
} satisfies ViolationsConfig
