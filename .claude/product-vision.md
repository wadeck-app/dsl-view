# Product Vision — dsl-view

## Current state
Two published packages:
- `@wadeck-app/dsl-renderer` — YAML DSL runtime engine and Vite build plugins for declarative React page authoring.
- `@wadeck-app/dsl-ui` — generic React UI components (DataTable, DialogForm, FieldText, etc.) consumed by renderer-built pages.

Target use case: admin and internal tooling pages defined in YAML, eliminating hand-written React component trees for data-driven UIs.

## Planned / signalled directions
- `generate-node-schemas` script in `dsl-ui` (`tsx scripts/generate-node-schemas.ts`) signals future JSON Schema tooling for component introspection — enables tooling (editors, validators) to understand the YAML DSL schema.
- `ContractAdapter` interface is pluggable (ZodContractAdapter is provided); multiple backend contract formats are a natural extension point.
- Brain system (`$brains`) supports HTTP, var mutations, navigation, chaining, polling — already present; continued expansion of action types is expected.

<!-- TODO: no formal roadmap file found — needs owner clarification on prioritized next milestones -->
