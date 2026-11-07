# Product Vision — dsl-view

## Current state
Two published packages:
- `@wadeck-app/dsl-renderer` — YAML DSL runtime engine and Vite build plugins for declarative React page authoring.
- `@wadeck-app/dsl-ui` — generic React UI components (DataTable, DialogForm, FieldText, etc.) consumed by renderer-built pages.

Target use case: admin and internal tooling pages defined in YAML, eliminating hand-written React component trees for data-driven UIs.

## Planned / signalled directions
- Shipped: `npm run generate-node-schemas` in `dsl-ui` generates the per-component Zod node schemas (`src/schemas/generated-node-schemas.ts`), `known-keys.json` ships the component key manifest for CLIs, and `compileDslDocument`/`compileDslPagesDir` (`dsl-renderer/build/dslCompiler`) run static DSL checks in CI. Not built: a JSON Schema export (no `toJSONSchema` or equivalent in `packages/*/src` or `scripts`) so editors and validators outside this toolchain can understand the YAML DSL.
- `ContractAdapter` interface is pluggable (ZodContractAdapter is provided); multiple backend contract formats are a natural extension point.
- Brain system (`$brains`) supports HTTP, var mutations, navigation, chaining, polling — already present; continued expansion of action types is expected.

<!-- TODO: no formal roadmap file found — needs owner clarification on prioritized next milestones -->
