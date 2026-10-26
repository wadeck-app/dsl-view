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

## Never use `dark:` variants

Forbidden in dsl-ui, enforced by `dsl-ui/no-dark-variant` with no exemptions.

The dark variant is configured as a descendant selector (`&:is(.dark *)`), so it applies under *any*
`.dark` ancestor. A scope re-asserting light inside a dark app flips the tokens and the
`color-scheme` but cannot flip the variant — the component stays dark on a light panel.

Not fixable in the selector: excluding `.light` descendants breaks the mirror case, dark nested
inside light, and CSS cannot express "nearest ancestor wins" for a variant. Tokens get it for free.

## Named hues

For things whose colour *is* their meaning — a tag's identity, an HTTP method, a status family —
where no semantic token applies. Two tokens per hue, a tint and an ink:
`bg-hue-{blue,green,yellow,orange,red,purple,cyan}-bg` and `text-hue-{…}`.

They replaced the `text-blue-600 dark:text-blue-400` pairs in `chipColors`, both HTTP badges and
`ColorPicker`, which were the last things that could not be nested.

Border and hover shades stay literal (`border-blue-400`): they are one value in both themes, so they
need no token. A raw colour class is fine; a raw colour class behind a `dark:` variant is not.

Write hue classes out in full. Tailwind scans source text, so `bg-hue-${hue}-bg` produces no rule
and the element gets an attribute with nothing behind it.

## Ink on solid fills

`text-on-solid` (`--color-on-solid`) is the text on `bg-primary` / `bg-success` / `bg-danger` fills. The preset falls back to white when the token is missing, which is right for light; an app with its own palette copy must add the token, and a dev build warns once per page until it does (`utils/onSolidToken.ts`). The check reads `:root`, so a token defined only on a nested `ThemeScope` still warns.

Contrast is pinned in `theme.test.ts` (>= 4.5:1): white ink on the light accents (`--color-primary`, `--color-primary-solid` and its hover, `--color-success`, `--color-danger`), the dark ink on the dark accents, and the accent used as text on the light surface (`--color-primary`, `--color-success-text`, `--color-danger-text`). The light accents are the Tailwind 600/700 shades (`#2563eb`, `#15803d`), not 500: white on `#3b82f6` was 3.68:1 and on `#16a34a` 3.30:1. A change to an accent token that drops under 4.5:1 fails that test. `_Button`'s `hover:bg-success/80` and `hover:bg-danger/80` blend with the page and are not pinned.

## Performance

A static scope costs one style resolution. Nesting is free — variables shadow.

The one real cost: changing a custom property invalidates computed style for the whole subtree, so
keep the `tokens` object's **values** stable. Rebuilding an equal object is fine, since React writes
only changed style properties. Declare the palette at module scope.

Cheaper than the context alternative, which re-renders every consumer on a theme change.

## App shell variables

`AppShell` publishes two layout variables on `<html>` while mounted (plus on its own root). Both are lengths and follow the shell's current state; props: `barOnScroll`, `menuVariant` (see the component doc).

| Variable | Value | Use |
|---|---|---|
| `--app-shell-bar-height` | 2.75rem; 1.5rem / 2rem / 0px per `barOnScroll` state | `top` of anything sticky under the bar: `top: var(--app-shell-bar-height, 0px)` |
| `--app-shell-menu-width` | 15rem; 13rem, 18rem, 5rem, 3.5rem, 15.5rem, 14rem or 1rem per `menuVariant` and fold state (`floating` includes its 0.75rem margin) | left inset of floating tools (the A/B dock) |
