---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [data-model.md, color-scheme.md, ../architecture/component-tree.md, ../architecture/rendering-strategy.md]
---

# Dark Mode

Optional support for alternative background images in dark mode. Spec
for **v0.1.1**, isolated feature with full backward compatibility.

## Context

v0.1.0 displays a single background image per floor (the `background`
field). This image is typically a plan exported from Sweet Home 3D or
equivalent, designed in light colours for good readability.

When the user enables HA dark mode (manually or via time-based
auto-detection), the rest of the Lovelace UI switches to dark, but the
card stays on the light plan — visual inconsistency that strains the
eyes in the evening.

The user wants to provide a **dark version** of each plan (typically
an inverted or restyled export) and have the card switch automatically
between the two depending on the HA context.

This feature is **isolated**: it affects neither navigation, nor
overlays, nor element colours. Only the background image.

## Goals

1. Allow an optional dark image declaration per floor
2. Automatic switch following the HA theme (with manual override
   possible)
3. Smooth crossfade between the two images, without flash or latency
4. Full backward compatibility: every v0.1.0 config works unchanged
5. If the dark variant is missing for a floor, graceful behaviour
   (fallback to default image + one-time console warning)

## Scope

### In

- New global setting `dark_mode: auto | on | off` (default `auto`)
- New `backgrounds: { default, dark }` field on each floor (extended
  form)
- Backward compatibility with the v0.1.0 `background` field (short
  form)
- Detection cascade: setting > `hass.themes.darkMode` >
  `prefers-color-scheme`
- DOM rendering with 2 `<image>` elements stacked and CSS crossfade
  ~200ms
- Optimisation: no dark DOM if `dark_mode: off`
- One-time console warning per floor without a dark variant in dark
  mode
- Update `dev/mock-hass.ts` to expose a dark-mode toggle
- New example `docs/examples/dark-mode.yaml`

### Out

- Element colours in dark mode (see
  [`color-scheme.md`](color-scheme.md) — the CSS variables stay
  identical, the HA theme handles colour consistency)
- Modes beyond light/dark (high-contrast, sepia, ambient...) —
  reserved for future keys in `backgrounds.<mode>`, not implemented
  in v0.1.1
- Auto-generation of a dark image from the light one (CSS inversion
  filters) — would be less readable than a dedicated image
- Pinch-zoom on plans (orthogonal to dark mode)

## Expected behaviour

### Source of the decision (cascade)

The current mode (`'light' | 'dark'`) is resolved by walking this
cascade, in order:

1. **Setting `settings.dark_mode`** (highest priority)
   - `on` → forces dark mode regardless of HA/browser context
   - `off` → forces light mode regardless of HA/browser context
   - `auto` (default) → delegated to the sources below

2. **HA `hass.themes.darkMode`** (in auto mode)
   - Official HA signal, follows the active theme and any
     time-based auto mode configured on the HA theme side

3. **Browser `window.matchMedia('(prefers-color-scheme: dark)')`**
   (fallback)
   - When `hass.themes.darkMode` is unavailable (HA not yet loaded,
     standalone mode, etc.)

### `backgrounds` field (extended form)

New optional field at the floor level:

```yaml
floors:
  - id: L0
    name: "Ground floor"
    backgrounds:
      default: /local/floorplans/L0-day.png
      dark: /local/floorplans/L0-night.png
```

| Key | Type | Required | Description |
|---|---|---|---|
| `default` | string | ✅ | Path used in `light` mode (and fallback) |
| `dark` | string | ❌ | Path used in `dark` mode |
| `<other>` | string | ❌ | Reserved for future modes (high-contrast, sepia...). Ignored in v0.1.1. |

### Backward compatibility with `background` (short form)

The v0.1.0 `background` field stays functional:

```yaml
floors:
  - id: L0
    name: "Ground floor"
    background: /local/floorplans/L0.png  # short form, v0.1.0
```

Runtime validation rules:

- At least **one** of the two fields `background` or `backgrounds`
  must be present. Otherwise: throw
  `Floor X requires either 'background' or 'backgrounds.default'`.
- If `backgrounds` is present, it **must** contain a `default` key.
  Otherwise: throw
  `Floor X has 'backgrounds' but no 'backgrounds.default'`.
- If both are present: `backgrounds` takes priority, `background` is
  ignored **silently** (acceptable transitory migration state, no
  warning).

### Image-path resolution algorithm

For a given floor and a current mode `'light' | 'dark'`:

```
IF floor.backgrounds is defined:
  IF mode === 'light':
    → backgrounds.default
  IF mode === 'dark':
    IF backgrounds.dark is present:
      → backgrounds.dark
    ELSE:
      → backgrounds.default + console.warn() (once)
ELSE (short form only):
  IF mode === 'light':
    → background
  IF mode === 'dark':
    → background + console.warn() (once, "no dark variant")
```

### DOM rendering and crossfade

For each floor, the component emits **2 stacked `<image>`** in the SVG
when a dark variant exists (extended form with `backgrounds.dark`)
**AND** when `settings.dark_mode !== 'off'`:

```html
<g id="fn-floor-L0">
  <image id="fn-floor-L0-bg-default" href="L0-day.png" class="fn-bg-default" />
  <image id="fn-floor-L0-bg-dark"    href="L0-night.png" class="fn-bg-dark" />
  <!-- overlays on top -->
</g>
```

If a floor has **no** dark variant (short form, or extended form
without `dark`), only the default `<image>` is emitted.

If `settings.dark_mode === 'off'`, the component does NOT emit the
dark `<image>` even when `backgrounds.dark` is declared in the config.
No useless DOM for an explicitly disabled mode.

A global class on the root component (`fn-theme-light` or
`fn-theme-dark`) determines which image is visible:

```css
.fn-bg-default, .fn-bg-dark {
  transition: opacity 200ms ease-in-out;
}
.fn-theme-light .fn-bg-default { opacity: 1; }
.fn-theme-light .fn-bg-dark    { opacity: 0; }
.fn-theme-dark  .fn-bg-default { opacity: 0; }
.fn-theme-dark  .fn-bg-dark    { opacity: 1; }
```

Both images stay in the DOM permanently; the toggle is purely
opacity-driven → smooth crossfade, no network re-fetch on switch.

### Subscribing to theme changes

The root component `floor-navigator-card`:

- Holds a `@state() currentTheme: 'light' | 'dark'`
- Recomputes `currentTheme` via `theme-resolver` on every `hass`
  update (reactive via Lit)
- Subscribes in `connectedCallback` to
  `window.matchMedia('(prefers-color-scheme: dark)')` via
  `addEventListener('change', ...)`
- Mandatory cleanup in `disconnectedCallback` to avoid memory leaks
  when navigating Lovelace

The `hass.themes.darkMode` change event does **not** require a custom
EventTarget: the `hass` prop being reactive, Lit re-renders
automatically when HA pushes a new value.

### Preloading and performance

Both images are loaded at initial mount (the 2 `<image>` are in the
DOM with their `href`), so the toggle is instant with no network
latency. The memory cost is doubled on floors that have both variants
— acceptable given that a floor plan PNG is typically 100–500 KB.

## Edge cases

### Floor without dark variant in dark mode

The user has declared `backgrounds: { default: ... }` without `dark`,
and the current mode is dark. Behaviour:
- Default image displayed
- `console.warn('[floor-navigator-card] Floor "L1" has no dark variant. Falling back to default image in dark mode.')`
  emitted **once** per floor instance (`_hasWarned: boolean` flag on
  `<fn-floor>`)
- No red placeholder or other visual signal

### Mix of floors with and without dark variant

The user has 3 floors: L0 and L2 have `backgrounds.dark`, L1 does
not. Behaviour in dark mode:
- L0 and L2: dark image
- L1: light image + one console warning
- Visually inconsistent, but the user has been warned and can
  provide the missing dark variant at their own pace

### HA theme toggle during a floor transition

The user navigates between floors and changes the HA theme at the
same time. Behaviour: the light/dark crossfade overlays the floor
transition motion. Visually fine because the transitions target
different properties (opacity for theme switch, transform for
navigation).

### `dark_mode: on` setting but no floor has `dark`

The user forces `dark_mode: on` but every floor is in short form
(`background` only). Behaviour: console warning emitted for each
floor (in each instance's connectedCallback, once), light images
displayed everywhere. Consistent with the "graceful fallback"
behaviour.

### `backgrounds.dark` with an invalid path (404)

The user declares `backgrounds.dark: /local/missing.png`. Behaviour:
the browser loads the image, the 404 produces a broken image (broken
image icon). No explicit handling in the component. The DevTools
network panel shows the 404 — easy to diagnose.

### Browser cache on a modified dark image

The user changes their dark image on the HAOS side during dev. The
browser serves the cached version. Workarounds:
- `Ctrl+Shift+R` to bypass cache
- Add a different query string (`?v=2`) to the path in the config

Documented in
[`../architecture/dev-workflow.md`](../architecture/dev-workflow.md).

### Multiple instances of the card on the same dashboard

The user has 2 `floor-navigator-card` cards on the same dashboard
(rare but possible use case). Each instance subscribes
independently to `matchMedia` and receives its own `hass`. No state
shared between instances. No particular issue.

### Standalone mode (no HA, quick dev)

In quick dev mode (`dev/index.html`), `hass` is mocked. The mock must
expose a togglable `themes.darkMode` to allow dark-mode testing
without real HA. Otherwise the browser `prefers-color-scheme`
fallback takes over.

## Open questions

None. The 4 structuring decisions (global vs per-floor setting,
naming `backgrounds`, crossfade transition, fallback warning) were
settled in the Claude Opus design session.

## Decisions

### Settled decisions (2026-05-03, Claude Opus session)

- **Granularity**: global `dark_mode` setting + optional per-floor
  declaration. Visual consistency driven globally, content
  declaration locally. Lets the user explicitly disable even when
  dark variants are provided.

- **Config override**: `auto | on | off` values (3 clear values)
  rather than a boolean or a richer enum. Covers every use case
  without complexity.

- **Naming `backgrounds.{default, dark}`**: extensible extended form
  for future modes (high-contrast, sepia...) without breaking the
  API. `default` rather than `light` because it is the universal
  fallback, not just the light-mode image.

- **Backward compatibility short `background` + extended
  `backgrounds`**: both forms supported simultaneously,
  `backgrounds` priority if both are present. Lets v0.1.0 configs
  work unchanged and migrate gradually.

- **Simple crossfade ~200ms** on opacity, rather than reusing the
  navigation transition system (slide, slide-scale). The light/dark
  toggle is semantically different from a spatial movement — it is
  an appearance change, not a level change.

- **Silent fallback + console warning** rather than "all or
  nothing" (global dark-mode disablement if a floor is missing).
  The user takes responsibility, the warning aids diagnosis.

- **Isolated v0.1.1 release** rather than v0.2.0 grouped. Self-
  contained feature, well isolated technically. Justifies a SemVer
  patch (full backward compatibility). See
  [`../architecture/conventions.md`](../architecture/conventions.md)
  for SemVer justification.

### Deferred decisions

- **Additional modes** (high-contrast, sepia, ambient...):
  `backgrounds.<mode>` structure ready to host them, but none
  implemented in v0.1.1. To consider in v0.4.0+ on demand.

- **Element colours in dark mode**: not in scope. CSS variables stay
  identical between light and dark. If the user wants different
  colours, they can define them in a dark HA theme.

## Implementation — to be detailed by Claude Code

This spec is `draft` until validation post-implementation. Claude
Code, following this spec, must:

1. Create `src/utils/theme-resolver.ts` — current mode resolution
2. Create `src/utils/background-resolver.ts` — image-path resolution
3. Extend `src/types/config.ts` — types `Backgrounds`, `dark_mode`
4. Modify `src/components/fn-floor.ts` — emit 2 `<image>` per
   context
5. Modify `src/floor-navigator-card.ts` — reactive `currentTheme`
   + matchMedia subscription + `fn-theme-*` class
6. Extend `src/styles/card-styles.ts` — crossfade CSS rules
7. Update `dev/mock-hass.ts` — `themes.darkMode` toggle
8. Create `docs/examples/dark-mode.yaml` — full example
9. Bump `CARD_VERSION` to `0.1.1` in `floor-navigator-card.ts`
10. Update the repo `README.md` — configuration section

Once implemented and validated:

- Status of this spec moves to `implemented`
- The new fields (`backgrounds`, `dark_mode`) are merged into
  [`data-model.md`](data-model.md)
- An ADR-005 is added in [`../decisions.md`](../decisions.md)
  recording the structuring choices
- A new changelog item appears in
  [`../README.md`](../README.md) under v0.1.1
