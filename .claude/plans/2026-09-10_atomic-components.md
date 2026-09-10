# Plan : Nouveaux composants atomiques dsl-ui

## Contexte

`dsl-ui` manque de briques atomiques standard présentes dans toutes les grandes libs (Mantine, Shadcn, Ant Design, Chakra, Radix). Objectif : combler les 15 gaps identifiés, en utilisant Radix UI comme primitive là où disponible, avec Storybook et tests Vitest pour chaque composant.

## État actuel

- **Radix** : absent -> installation nécessaire
- **Storybook** : absent -> setup from scratch (Storybook 8 react-vite)
- **Vitest + Testing Library** : déjà configuré (jsdom, globals, `src/test-utils.tsx`)
- **Pattern** : fonctions React nommées + interface TypeScript + classes Tailwind inline + JSDoc `@registryCategory`
- **Colors** : CSS vars (`--color-primary-solid`, `border-border`, `bg-surface`, `text-content`, etc.)

## Composants à créer (15)

### Display (`src/components/display/`)
| Composant | Radix | Registrable |
|-----------|-------|-------------|
| `Badge` | Non | `@registryCategory atomic` |
| `Skeleton` | Non | `@registryCategory atomic` |
| `Spinner` | Non | `@registryCategory atomic` |
| `Tag` | Non | `@registryCategory atomic` |
| `Avatar` | `@radix-ui/react-avatar` | `@registryCategory atomic` |
| `Progress` | `@radix-ui/react-progress` | `@registryCategory atomic` |

### Controls (`src/components/controls/`)
| Composant | Radix | Registrable |
|-----------|-------|-------------|
| `Switch` | `@radix-ui/react-switch` | `@registryCategory atomic` |
| `Slider` | `@radix-ui/react-slider` | `@registryCategory atomic` |
| `IconButton` | Non (étend `_Button`) | `@registryCategory atomic` |
| `CheckboxGroup` | Non (wraps `Checkbox`) | `@registryCategory atomic` |
| `RadioGroup` | `@radix-ui/react-radio-group` | `@registryCategory atomic` |

### Layout (`src/components/layout/`)
| Composant | Radix | Registrable |
|-----------|-------|-------------|
| `Divider` | `@radix-ui/react-separator` | `@registryCategory atomic` |
| `Collapsible` | `@radix-ui/react-collapsible` | `@registryCategory disposition` |

### Navigation (`src/components/navigation/`)
| Composant | Radix | Registrable |
|-----------|-------|-------------|
| `Link` | Non | `@registryCategory atomic` |

### Form (`src/components/form/`)
| Composant | Radix | Registrable |
|-----------|-------|-------------|
| `FieldAutocomplete` | `@radix-ui/react-popover` | `@registryCategory atomic` + `@registryBind` |

## Radix packages à installer (devDeps de `packages/dsl-ui`)

```
@radix-ui/react-avatar
@radix-ui/react-collapsible
@radix-ui/react-progress
@radix-ui/react-radio-group
@radix-ui/react-separator
@radix-ui/react-slider
@radix-ui/react-switch
@radix-ui/react-popover
```

## Setup Storybook

Dossier : `packages/dsl-ui/.storybook/`

- `main.ts` : framework `@storybook/react-vite`, stories glob `../src/**/*.stories.tsx`
- `preview.ts` : import global CSS Tailwind (à identifier ou créer)
- devDeps à ajouter : `@storybook/react-vite`, `@storybook/react`, `storybook`, `@storybook/addon-essentials`
- Script `package.json` : `"storybook": "storybook dev -p 6006"`, `"build-storybook": "storybook build"`

## Pattern par composant (à respecter)

**Fichier composant** :
```tsx
// classes Tailwind dans des consts nommées au top du fichier
// interface TypeScript explicite
// JSDoc @registryCategory + @registryTags
// fonction nommée (pas arrow)
```

**Fichier test** (`ComponentName.test.tsx`) :
```tsx
// import { render, screen, fireEvent } from '@testing-library/react'
// import { describe, it, expect, vi } from 'vitest'
// renderWithMocks si Toast nécessaire, sinon render direct
// Couvrir : rendu, variants/states, interactions, accessibilité (aria-*)
```

**Fichier story** (`ComponentName.stories.tsx`) :
```tsx
// import type { Meta, StoryObj } from '@storybook/react'
// Meta avec title: 'Atomic/ComponentName' (ou Controls/Display/Layout)
// Story par variant/état important
```

## Exports à ajouter dans `src/index.ts`

Un export par composant, groupé par catégorie, suivant le pattern existant.

## Ordre d'exécution (agents parallèles)

1. **Étape 0** (séquentiel) : installer Radix + Storybook deps, créer config Storybook
2. **Étape 1** (3 agents parallèles) :
   - Agent A : Badge, Skeleton, Spinner, Tag, Progress + tests + stories
   - Agent B : Switch, Slider, Divider, Collapsible + tests + stories
   - Agent C : Avatar, Link, IconButton, CheckboxGroup, RadioGroup + tests + stories
3. **Étape 2** (1 agent) : FieldAutocomplete + test + story + tous les exports index.ts

## Vérification

- `npm run test` dans `packages/dsl-ui` -> tous verts
- `npm run storybook` -> Storybook lance, tous les composants visibles avec leurs variants
- `npm run build` -> build TypeScript sans erreur
