# Frontend Design Tokens

This guide explains which token to use when building new frontend components.
The source of truth is [src/assets/globals.css](../src/assets/globals.css).

## Principles

- Use semantic tokens first, not raw hex or rgba values.
- Add new tokens only in `globals.css` when a component needs a role that does not already exist.
- Prefer one token per visual role so the same component looks correct in light mode, dark mode, and RTL.
- Avoid directional color logic in components; keep the palette centralized.

## Token Map

| Need                             | Use                                                                                                                                                         | Notes                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Main brand surfaces              | `--color-primary`, `--color-primary-dark`, `--color-primary-light`                                                                                          | For headers, hero panels, primary CTAs, active nav, and brand accents. |
| Secondary brand accents          | `--color-secondary`, `--color-accent`, `--color-accent-hover`                                                                                               | Use for supporting emphasis, badges, and alternate highlight states.   |
| Page background and cards        | `--color-background`, `--color-surface`, `--color-border`, `--color-divider`                                                                                | Use these for ordinary layout and neutral UI surfaces.                 |
| Body text                        | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text`                                                                      | Use the strongest token that still matches the role.                   |
| Text on dark or primary surfaces | `--color-text-on-primary`, `--color-on-dark-*`, `--color-accent-on-dark`                                                                                    | Use these on nav bars, hero cards, filled CTAs, and glass panels.      |
| Success / info / error / warning | `--color-success`, `--color-info`, `--color-error`, `--color-warning`                                                                                       | Pair with the matching alpha tokens for backgrounds and outlines.      |
| Soft tints                       | `--color-primary-alpha-*`, `--color-accent-alpha-*`, `--color-success-alpha-*`, `--color-error-alpha-*`, `--color-info-alpha-12`, `--color-warning-alpha-*` | Use for chips, focus rings, notices, empty states, and subtle fills.   |
| Dark overlays                    | `--color-overlay-*`                                                                                                                                         | Use on top of dark or primary-colored backgrounds.                     |
| Glass cards                      | `--glass-bg`, `--glass-bg-elevated`, `--glass-border`, `--glass-blur`                                                                                       | Use for frosted panels and translucent shells.                         |
| Shadows                          | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-heavy`, `--shadow-primary-*`, `--shadow-accent-*`, `--shadow-warning`, `--shadow-toast`              | Pick the shadow family that matches the surface color.                 |
| Nav background                   | `--nav-bg`, `--nav-border`                                                                                                                                  | Use for the primary side nav and other dark app chrome.                |

## Usage Rules

1. Use `--color-primary` for the dominant brand action or surface.
2. Use `--color-accent` for warm, celebratory, or secondary emphasis.
3. Use `--color-text-on-primary` whenever text sits on a filled primary or accent surface.
4. Use `--color-overlay-*` instead of ad hoc white rgba values on dark shells.
5. Use the matching alpha token before inventing a new translucent color.
6. Use `--shadow-primary-*` for teal cards, `--shadow-accent-*` for amber cards, and `--shadow-toast` for notifications.
7. Keep raw color literals out of component CSS. If a new color role is needed, add it once in `globals.css` and document it here.

## Common Patterns

```css
background: var(--color-primary);
color: var(--color-text-on-primary);
box-shadow: var(--shadow-primary-md);
```

```css
background: var(--color-overlay-subtle);
border: 1px solid var(--color-overlay-border);
color: var(--color-on-dark-high);
```

```css
background: color-mix(in srgb, var(--color-warning) 10%, var(--color-surface));
border-color: var(--color-warning-alpha-24);
```

## When To Add A New Token

Add a new token only if:

- a color role is used in at least two components, or
- the same visual role needs different values in light and dark mode, or
- the color is semantically meaningful enough that a component should not hardcode it.

If you are unsure, prefer extending the existing semantic palette over adding a one-off literal.
