# Theming

Tokens live in `packages/dsl-ui/src/theme.css`, the file consumers import. Components style
themselves from semantic tokens (`bg-surface`, `text-content`, `border-border`, `bg-muted-bg`,
`text-muted`) and never from raw palette classes.

## Two mechanisms, different jobs

| | `ThemeContext` / `useTheme` | `ThemeScope` |
|---|---|---|
| Question it answers | which theme is the app in | what palette is THIS subtree painted in |
| Mechanism | React state | CSS cascade |
| Scope | whole app | one subtree |
| Togglable | yes | no, declarative |

They compose: an app toggles the theme, and a `ThemeScope` inside it opts a region out.

## ThemeScope

```tsx
<ThemeScope theme="dark" surface="panel">…</ThemeScope>
```

Applies the `dark` or `light` class, which carries **both** the `--color-*` palette and
`color-scheme` — see the rule in `theme.css`. Keeping them on one class is the point: setting tokens
without `color-scheme` gives a white scrollbar down a near-black panel.

`surface` paints a background (`page` default, `panel`, `none`), so a scope cannot end up with this
theme's text colour over the surrounding theme's background.

`tokens` takes CSS custom properties for a palette that is neither light nor dark — a terminal, a
code viewer. `LogViewer` in the orchestrator is the reference use.

### Why not a React context

A context would require every component to read it and apply classes itself, which is the same as
adding a `theme` prop to all of them. The cascade means a component opts into nothing, including
markup this library has never heard of. It also reaches what React cannot: `color-scheme` is what
makes the browser paint scrollbars, native select dropdowns, checkboxes and number spinners.

### Why not a prop on every component

`color-scheme` only affects browser-drawn chrome. Fourteen of roughly eighty dsl-ui components draw
any; on the rest the prop would be inert — an option that appears to work and does nothing.
`ScrollArea` keeps a `scheme` prop because a scroll surface is exactly the case where it matters.

## Nesting

Nests to any depth, alternating freely. Custom properties inherit, so a descendant takes its value
from the **nearest** scope above it. Selector specificity never enters into it — that would only
matter if two theme classes landed on the same element.

Verified at four alternating levels, including the native select and the scrollbar at each.
See the `Layout/ThemeScope` stories, `AlternatingFourLevels`.

## The one thing that breaks it: `dark:` variants

Forbidden in dsl-ui components, enforced by `dsl-ui/no-dark-variant`.

The dark variant is configured as a descendant selector (`&:is(.dark *)`), so it applies under *any*
`.dark` ancestor. A scope re-asserting light inside a dark app flips the tokens and the
`color-scheme` but cannot flip the variant — the component stays dark on a light panel.

Not fixable in the selector: excluding `.light` descendants breaks the mirror case, dark nested
inside light, and CSS cannot express "nearest ancestor wins" for a variant. Tokens get it for free.

Four files still carry `dark:` and are named in the rule: `chipColors.ts` (the seven hue palettes
only — the default palette is tokenised), `HttpMethodBadge`, `HttpStatusBadge`, `ColorPicker`. Their
per-hue tints have no token equivalent yet; fixing them means adding per-hue tokens.

## Performance

A static scope costs one style resolution. Nesting is free — variables shadow.

The one real cost: changing a custom property invalidates computed style for the whole subtree, so
keep the `tokens` object's **values** stable. Rebuilding an equal object is fine, since React writes
only changed style properties. Declare the palette at module scope.

Cheaper than the context alternative, which re-renders every consumer on a theme change.
