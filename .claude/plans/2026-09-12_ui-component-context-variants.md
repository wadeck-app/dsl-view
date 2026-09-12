# Plan: UI Component Context Variants

**Spec:** .claude/specs/2026-09-12_ui-component-context-variants/
**Package:** `packages/dsl-ui`

---

## Deliverables summary

| Layer | Items |
|---|---|
| `_Button` extensions | `size="icon|icon-sm|icon-xs"`, `variant="link"` |
| Button shapes (wrappers) | `IconButton`, `TabButton`, `DeleteButton` |
| Context mechanism | `useProvideButtonContext` hook + per-container context types |
| Layout containers | `ActionBar`, `NavBar`, `TableRowActions`, `CardActions`, `DialogFooter`, `PageHeader` |

Each item ships with: unit tests, Storybook story, DSL `@registryCategory` tag (where consumer-facing).

---

## Phase 1 -- `_Button` CVA extensions

**Files:** `src/components/controls/_Button.tsx`

- Add to CVA `size`: `icon: 'h-9 w-9 p-0'`, `icon-sm: 'h-7 w-7 p-0'`, `icon-xs: 'h-5 w-5 p-0'`
- Add to CVA `variant`: `link` -- no background, primary text color, underline on hover, no padding
- Update TypeScript `ButtonSize` and `ButtonVariant` union types

**Tests** (`_Button.test.tsx`):
- Renders correct class for each new `size` value
- Renders correct class for `variant="link"`
- Explicit prop still wins when inside a context provider (regression guard for Phase 3)

**Storybook** (`_Button.stories.tsx`):
- Add `Icon sizes` story: grid of all three icon sizes with a sample icon
- Add `Link variant` story: inline text with a link-styled button

---

## Phase 2 -- Button shape wrappers

### IconButton

**File:** `src/components/controls/IconButton.tsx`

- Wraps `_Button` with `size="icon"` default
- `aria-label: string` -- **required** (TypeScript enforced, not optional)
- `icon: React.ReactNode` -- replaces `children`
- Renders `aria-label` as tooltip on hover (default behavior via `title` attribute or Tooltip wrapper if already in dsl-ui)
- `@registryCategory controls`

**Tests:** aria-label present in DOM; TypeScript error when aria-label omitted (compile-level test or `@ts-expect-error` assertion).

**Storybook:** sizes (xs/sm/md), variants (ghost/secondary/danger), tooltip visible on hover.

---

### TabButton

**File:** `src/components/controls/TabButton.tsx`

- Wraps `_Button` with `variant="ghost"` default
- `active: boolean` prop -- adds `border-b-2 border-primary` (or equivalent active token) when true
- Does NOT manage selection state -- parent is responsible
- `@registryCategory controls`

**Tests:** active class present when `active=true`, absent when false; inherits focus/hover from `_Button`.

**Storybook:** inactive / active states; horizontal tab bar example with three `TabButton` siblings.

---

### DeleteButton

**File:** `src/components/controls/DeleteButton.tsx`

- Wraps `_Button` with hardcoded `variant="danger" size="sm"`
- Passes `action` (DSL), `onClick`, `disabled`, `loading` through
- `@registryCategory controls`

**Tests:** always renders danger+sm class regardless of any parent context (context must not override hardcoded props -- P-2 does not apply here, the wrapper itself is the explicit decision).

**Storybook:** default, loading, disabled states.

---

## Phase 3 -- Container context mechanism

**File:** `src/components/controls/buttonContext.ts`

```ts
export interface ButtonContextValue {
  size?: ButtonSize
  defaultVariant?: ButtonVariant
}

export const ButtonContext = createContext<ButtonContextValue | null>(null)

// For containers: read parent value, merge own overrides, return merged value to pass to Provider
export function useProvideButtonContext(own: ButtonContextValue): ButtonContextValue {
  const parent = useContext(ButtonContext)
  return useMemo(() => ({ ...parent, ...own }), [parent, own])
}

// For consumers (_Button, sub-components): read merged context
export function useButtonContext(): ButtonContextValue {
  return useContext(ButtonContext) ?? {}
}
```

**`_Button` update:** read `useButtonContext()` and use `size ?? ctx.size ?? 'md'` and `variant ?? ctx.defaultVariant ?? 'primary'`.

**Tests:**
- `useProvideButtonContext` merges parent + own correctly (innermost wins per key)
- Nested providers: inner value wins, outer value preserved for keys inner does not override
- Explicit prop on `_Button` wins over context value
- `DeleteButton` hardcoded props are NOT affected by context (wrapper provides explicit values)

---

## Phase 4 -- Layout containers

Each container: publishes context via `useProvideButtonContext`, provides flex layout, exports as named component + DSL `@registryCategory layout`.

### Containers and their context values

| Component | Context published | Layout |
|---|---|---|
| `ActionBar` | `{ size: 'sm' }` | `flex items-center gap-4 mt-8` |
| `NavBar` | `{ size: 'sm', defaultVariant: 'ghost' }` | `flex items-center gap-2` (horizontal) |
| `TableRowActions` | `{ size: 'sm', defaultVariant: 'ghost' }` | `flex items-center gap-1` |
| `CardActions` | `{ size: 'sm' }` | `flex items-center gap-2 pt-2` |
| `DialogFooter` | `{ size: 'md' }` | `flex items-center justify-end gap-3 border-t pt-4` |
| `PageHeader` | *(none -- layout only)* | `flex items-center justify-between mb-6` |

**Files:** `src/components/layout/{ActionBar,NavBar,TableRowActions,CardActions,DialogFooter,PageHeader}.tsx`

**Tests (per container):**
- Renders children with correct context value (`renderHook` + `useButtonContext` inside child)
- Explicit child prop overrides context
- Nested containers: innermost context wins per key

**Storybook (per container):**
- Canonical usage: container with 2-3 `ButtonAction` children at various variants
- "No props needed" story: buttons inside container render correctly without explicit `size` or `variant`

---

## Phase 5 -- Violation sweep

Run after all phases complete.

### TypeScript
```
cd packages/dsl-ui && npx tsc --noEmit
```
Zero errors required before merge.

### ESLint + accessibility
```
cd packages/dsl-ui && npx eslint src --ext .tsx,.ts
```
Check for:
- Any remaining raw `<button>` usage that should be `_Button` or a wrapper
- Missing `aria-label` on `IconButton` usages (TypeScript already enforces this, ESLint is a second gate)

### axe-core in Storybook
Run accessibility checks on all new stories via `@storybook/addon-a11y`. Zero WCAG Level A violations required.

---

## Phase 6 -- Visual review

### Screenshot comparison
Run Storybook and capture screenshots for:
- All new button shapes (IconButton sizes, TabButton active/inactive, DeleteButton states)
- All layout containers with buttons inside
- Side-by-side against capability-framework equivalents where they exist (`ButtonSave`, `ButtonCancel`, `DialogForm`) -- verify visual consistency

Checklist:
- [ ] Icon sizes are visually square (height = width)
- [ ] `variant="link"` is visually distinct from `variant="ghost"` (underline on hover)
- [ ] `TabButton` active state underline aligns with the design convention in cap-fw `PageTabs`
- [ ] `ActionBar` children render at `sm` size without any explicit size prop
- [ ] `NavBar` children render ghost at `sm` size without any explicit props
- [ ] `DialogFooter` children render at `md` size (same as default -- verify context fires without visual regression)
- [ ] `DeleteButton` is always danger+sm regardless of parent container

---

## Phase 7 -- Code review

Run `code-reviewer` agent against all new files in `src/components/controls/` and `src/components/layout/`.

Focus areas:
- Context merge correctness (innermost wins, no key drops)
- `DeleteButton` hardcoded props cannot be overridden by context
- `IconButton` `aria-label` is required in TypeScript (not just documented)
- No `useContext` calls added anywhere outside `buttonContext.ts` and the containers

---

## Sequence

```
Phase 1 (_Button extensions)
  --> Phase 2 (wrappers -- depend on new sizes/variants)
    --> Phase 3 (context mechanism -- _Button update depends on Phase 1 being stable)
      --> Phase 4 (containers -- depend on Phase 3)
        --> Phase 5 (violations)
          --> Phase 6 (screenshots)
            --> Phase 7 (code review)
```

Phases 2 and 3 can be parallelized (wrappers don't need context; context doesn't need wrappers).
Phase 4 containers can be built in parallel once Phase 3 is done.
