# Guiding Principles — dsl-view

## YAML authoring surface
- YAML is the authoring surface; React is an implementation detail hidden from page authors.
- `$type` is the only required key for component resolution; all other props are optional.
- Expression resolution: prop values starting with `$` are resolved at render time against context (`$sources`, `$vars`, `$route`, `$outputs`, `$brains`, `$ctx`).

## Component registry
- `@registryCategory` JSDoc annotation is required for a component to appear in the registry — missing it causes silent exclusion with no warning (known pitfall).
- Its value must be `atomic`, `composite` or `disposition`. Anything else compiles here and fails as a type error in a *consuming* app's generated registry; layout components use `disposition`, not `layout`. Enforced by `dsl-ui/valid-registry-category`.
- `entriesGenerator` Vite plugin auto-discovers components by scanning for `@registryCategory`; do not manually maintain `src/generated/entries.tsx`.
- Generated files under `src/generated/` are committed so editors have types without running the dev server.

## Consumer responsibilities
- Consumer wires `react-router-dom` routing; renderer does not set up routes.
- Consumer supplies `fetcher` prop to `GenericPageRunner`; renderer has no default fetcher.
- Consumer provides `getToken`; renderer does not enforce or validate tokens.
- Consumer manages the Tailwind pipeline, but `dsl-ui` owns the palette: it ships `theme.css` (the tokens and `color-scheme`) plus `tailwind-preset.js`, and the consumer imports both. It ships no compiled utility CSS.
- `content` must list dsl-ui's sources via the preset's named `dslUiContent` export — Tailwind reads `content` from the top-level config only, so a preset cannot contribute scan paths. Omitting it builds successfully and renders every dsl-ui component unstyled.

## Theming
- Components style themselves from semantic tokens, never raw palette classes and never Tailwind `dark:` variants — a `dark:` variant applies under any `.dark` ancestor, so a component using one cannot be nested in a `ThemeScope` that re-asserts light. Enforced by `dsl-ui/no-dark-variant`.
- `ThemeScope` themes a subtree via the cascade; `ThemeContext`/`useTheme` toggles the app. See `.claude/docs/theming.md`.

## Build-time safety
- `pageTypesGenerator` Vite plugin validates YAML `$sources` URLs against Zod contract types at build time — a URL mismatch fails the TypeScript build.
- `__baseUrl` must be stripped before merging multiple `defineRoutes` results, or TypeScript errors occur.
- YAML files must use the `?raw` Vite import suffix.
- `dsl.config.yaml` must be adjacent to `vite.config.ts`.

## Source authority
- `dsl-view` packages are always authoritative; mirrors in `capability-framework` are for HMR dev only and must not be treated as canonical.
- Published to GitHub Packages (`npm.pkg.github.com`).
- Peer deps: React 19, Vite 6 (build consumers only), react-dom 19.

## From lessons learned

- Call `ToolSearch("select:<toolName>")` before invoking any deferred tool (find-project, write-doc, goldfish, etc.) — calling without the schema fetch produces a silent "NOT YET KNOWN" failure, not an error message (session 5610612a).
- Consumer reference documentation belongs in `.claude/docs/<name>-reference.md`; do not create AGENT.md or root-level README sections for package-scoped guides — the correct location was discovered through iteration and should be decided upfront.
- Do not write files outside the project root — the `cross-home-write` guardrail will block it; when creating any doc or plan file, verify the path is under the project directory before writing.
