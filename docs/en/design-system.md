# Design system

> 🇫🇷 [Version française](../fr/design-system.md)

## Role

Keeps every page looking the same: one set of colours, text sizes, spacing, radii and shadows, and one
set of shared components (buttons, chips, fields…). Pages only lay themselves out.

## Files

| File | Content |
|---|---|
| `src/styles/tokens.css` | The tokens: the **only** place where raw colours, text sizes, radii and shadows are written |
| `src/styles/components.css` | Base rules and shared components, built from the tokens |
| `src/styles.css`, `src/admin/admin.css` | Layout and page-specific parts of the trip page and the admin page |
| `src/theme.ts` | Recomputes the theme colours (accent, banner, surfaces…) from a trip's three colours, in light and dark mode |
| `design-system.html`, `src/dev/designSystem.ts` | Reference page (development only): every token and component, drawn with the real stylesheets |
| `src/styles/designSystem.test.ts` | The guards (see below) |

## Tokens

| Family | Variables | Use |
|---|---|---|
| Text sizes | `--text-2xs` (10) … `--text-3xl` (24), `--text-title`, `--text-date` | Every `font-size` |
| Weights | `--weight-light` … `--weight-bold` | Every `font-weight` |
| Space | `--space-1` (4) … `--space-8` (32) | Gaps and paddings of components |
| Radii | `--radius-xs` (4) … `--radius-xl` (14), `--radius-pill`, `--radius-round` | Every `border-radius` |
| Shadows | `--shadow-sm`, `--shadow-pop`, `--shadow-bar`, `--shadow-dialog`, `--backdrop` | Elevation |
| Fixed colours | `--white`, `--danger`, `--highlight`, `--sky-*`, `--face-*`… | Same on every trip |
| Theme colours | `--accent`, `--accent-ink`, `--bg`, `--surface`, `--fg`, `--muted`, `--line`, `--tint`, `--banner-*`… | Follow the trip's colours; the values in `tokens.css` are fallbacks |

Dark mode: fixed colours that need it (`--danger*`) are redefined in the dark blocks of `tokens.css`;
theme colours are recomputed by `theme.ts`.

## Components

`components.css` documents each one in a comment above its rules: `.btn` (`.fill`, `.danger`,
`[data-armed]`, `.small`), `.link-btn`, `.chip` (`.live`), tooltips (`.tip`, `.who`), `.panel`, form
(`.form`, `.row`, `.field` with `.narrow` / `.tiny`, `.hint`), `.seg`, `dialog.dialog`, `.msg` (`.bad`),
`.tag` (`.all`, `.now`, `.vote`, `.tie`), `.settings-btn`, `.error`.

## Extend

- **A new value** (a size, a colour): add a token to `tokens.css`, in its family, with a comment on its
  use; for a colour that must change in dark mode, also in the two dark blocks.
- **A new component used by more than one page**: add it to `components.css` with a comment listing its
  variants, then show it on the reference page (`src/dev/designSystem.ts`).
- **Something used by one page only**: in that page's stylesheet, with tokens.
- Colours set from code (an inline `style`, an SVG): use `var(--token)`, never a raw colour.

## Test

`npm test` runs the guards:
- no raw colour (`#…`, `rgb()`, `hsl()`) in a stylesheet other than `tokens.css`, nor in code other than `theme.ts`;
- no `font-size` or `border-radius` written in pixels outside `tokens.css`;
- no `var(--…)` that nothing defines (catches a misspelt token).

To look at the result: `npm run dev`, then [`/trip-planner/design-system.html`](http://localhost:5173/trip-planner/design-system.html),
also listed on the preview page.

## Pitfalls

- The guards skip `src/dev/` (preview tools with their own neutral look) and test files.
- Spacing is not guarded: components use the `--space-*` scale, page layouts may still use other values.
- `tokens.css` and `components.css` must be imported before the page stylesheet (see `src/main.ts`,
  `src/admin/main.ts`).
