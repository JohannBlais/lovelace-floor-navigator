# Floor Navigator

> Multi-level interactive floor plans for Home Assistant. Scroll or swipe between floors, overlay your entities on SVG layers, and control your home spatially.

[![build](https://github.com/JohannBlais/lovelace-floor-navigator/actions/workflows/build.yml/badge.svg)](https://github.com/JohannBlais/lovelace-floor-navigator/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Lovelace card that turns your 2D floor plans (PNG, JPG, or SVG) into a navigable
dashboard. Use the wheel on desktop or swipe on mobile to browse between floors,
and drop entity overlays — lights, sensors, presence, infrastructure — directly
on the plan at the coordinates you choose.

---

## Features

- **N stacked floors** with wheel + swipe navigation
- **3 transition modes** : `crossfade` (default), `slide`, `slide-scale`
- **Edge bounce / loop / none** at the first/last floor
- **Entity overlays** layered on top of each floor :
  - `icon` — colored pastille with MDI glyph, state-driven color
  - `text` — entity value with unit + precision (great for temperatures)
- **HA-standard tap actions** : `toggle`, `more-info`, `navigate`,
  `call-service`, `url`, `none`
- **Toggle button bar** to show/hide each overlay
- **Floor indicator** pill showing the current floor's name
- **CSS variables** for full theming (per-domain colors, halo, text shadow…)
- **Pan-zoom** (v0.2.0+) — pinch on mobile, Ctrl/Cmd+wheel on desktop,
  double-tap to toggle. At zoom > 1, single-finger drag pans.
- **Fullscreen mode** (v0.2.0+) — corner button promotes the card to
  the full viewport; Escape, browser back, or the same button to exit.
  Zoom / floor / overlay state survives enter/exit.
- **Screen-space overlay sizing** (v0.2.0+) — `overlay_size_unit: px`
  keeps icons and text at constant pixel size across screen widths
  and zoom levels.

---

## Installation

### Via HACS — custom repository (recommended for now)

Floor Navigator is not yet in the default HACS catalog (planned for v0.3.0).
Until then, add it as a custom repository :

1. HACS → three-dots menu → **Custom repositories**
2. Repository : `https://github.com/JohannBlais/lovelace-floor-navigator`
3. Category : **Lovelace**
4. Install **Floor Navigator** from the HACS list
5. Reload the dashboard (Ctrl+Shift+R)

### Manual

1. Download `floor-navigator.js` from the [latest release](https://github.com/JohannBlais/lovelace-floor-navigator/releases/latest) assets
2. Copy it to `<config>/www/floor-navigator/floor-navigator.js` on your HA host
3. Declare the resource in Lovelace : **Settings → Dashboards → Resources → Add resource**
   - URL : `/local/floor-navigator/floor-navigator.js`
   - Type : **JavaScript Module**
4. Reload the dashboard (Ctrl+Shift+R)

Once installed, the card appears in the visual card picker as **Floor Navigator**,
or you can add it manually in YAML.

---

## Quick start — minimal config

```yaml
type: custom:floor-navigator-card
viewbox: "0 0 1920 1080"
floors:
  - id: L0
    name: Rez-de-chaussée
    background: /local/floor-plans/L0.png
```

That's the bare minimum : one floor, no overlays. The image must exist under
`<config>/www/floor-plans/L0.png` for `/local/...` to serve it.

---

## Configuration

### Card root

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Always `custom:floor-navigator-card` |
| `viewbox` | string | ✅ | SVG viewBox, e.g. `"0 0 1920 1080"` — defines the coordinate system for `position` |
| `settings` | object | ❌ | See [Settings](#settings) |
| `floors` | array | ✅ | One or more floor definitions |
| `overlays` | array | ❌ | Zero or more overlay layers |

### Settings

| Field | Type | Default | Values |
|-------|------|---------|--------|
| `transition` | enum | `crossfade` | `crossfade`, `slide`, `slide-scale` |
| `transition_duration` | number (ms) | `400` | 100–2000 |
| `start_floor` | string | first floor | id of a declared floor |
| `navigation_mode` | enum | `both` | `wheel`, `swipe`, `both`, `none` |
| `edge_behavior` | enum | `bounce` | `bounce`, `none`, `loop` |
| `show_floor_indicator` | boolean | `true` | — |
| `overlay_buttons_position` | enum | `bottom` | `top`, `bottom`, `none` |
| `dark_mode` | enum | `auto` | `auto`, `on`, `off` — see [Dark mode](#dark-mode) |
| `overlay_size_unit` | enum | `viewbox` | `viewbox`, `px` (v0.2.0+) — see [Overlay readability](#overlay-readability) |
| `min_icon_px` | number | `24` | Screen-pixel clamp for icons (v0.2.0+) |
| `min_text_px` | number | `14` | Screen-pixel clamp for text (v0.2.0+) |
| `zoom_min` | number | `1` | Minimum scale factor (v0.2.0+) — see [Pan-zoom](#pan-zoom) |
| `zoom_max` | number | `4` | Maximum scale factor (v0.2.0+) |
| `zoom_step` | number | `0.1` | Increment per Ctrl+wheel notch (v0.2.0+) |
| `zoom_double_tap_scale` | number | `2` | Target scale on double-tap toggle (v0.2.0+) |
| `fullscreen_button` | enum | `auto` | `auto`, `always`, `never` (v0.2.0+) — see [Fullscreen mode](#fullscreen-mode) |
| `fullscreen_button_position` | enum | `top-right` | `top-right`, `top-left`, `bottom-right`, `bottom-left` (v0.2.0+) |

### Floor

A floor must declare its background image in **one** of two forms — short or
extended. Both are valid; the extended form opens the door to a dark variant
(see [Dark mode](#dark-mode) below).

**Short form** (v0.1.0, compat backward) :

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique among floors |
| `name` | string | ✅ | Shown in the floor indicator |
| `background` | string | ✅ | Path/URL to PNG, JPG, or SVG |

**Extended form** (v0.1.1+) :

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique among floors |
| `name` | string | ✅ | Shown in the floor indicator |
| `backgrounds` | object | ✅ | `{ default: string, dark?: string }` |
| `backgrounds.default` | string | ✅ | Path used in light mode + universal fallback |
| `backgrounds.dark` | string | ❌ | Path used in dark mode (see [Dark mode](#dark-mode)) |

If both `background` and `backgrounds` are set, `backgrounds` wins and
`background` is ignored silently — useful for staged migration.

The order of `floors[]` is the navigation order : scrolling down advances to
the next item in the list.

### Dark mode

The card can swap each floor's background image when HA is in dark mode.
Declare a `backgrounds.dark` per floor and the card crossfades between
`default` and `dark` automatically.

```yaml
floors:
  - id: L0
    name: Rez-de-chaussée
    backgrounds:
      default: /local/floor-plans/L0-day.png
      dark: /local/floor-plans/L0-night.png
```

The current theme is resolved by walking this cascade :

1. `settings.dark_mode: on` / `off` — explicit override (highest priority)
2. `hass.themes.darkMode` — the official HA signal, follows your active theme
3. `prefers-color-scheme: dark` from the browser (fallback)

If a floor has no `backgrounds.dark` (short form, or extended form without
`dark`), the card falls back to the default image when in dark mode and emits
a one-time `console.warn` per floor instance. No broken-image flash.

When `settings.dark_mode: off`, the dark `<image>` is **not** emitted in the
DOM at all — no inert image to download or hold in memory.

See [`docs/examples/dark-mode.yaml`](docs/examples/dark-mode.yaml) for a
complete example.

### Pan-zoom

Available from v0.2.0. Three input sources converge to the same
`Transform { scale, x, y }` state on the active floor:

- **Pinch** (mobile) — two-finger pinch in / out for zoom; single-finger
  drag pans when zoomed in (and stays a floor swipe at scale 1)
- **Ctrl/Cmd + wheel** (desktop) — zoom around the cursor position;
  plain wheel still navigates between floors
- **Double-tap / double-click** — toggle between identity and
  `zoom_double_tap_scale`; double-tap on overlay icons / text is
  reserved for the element's own click handler

The transform is applied as a CSS `translate() scale()` on the floor
stack; the SVG `viewBox` stays the canonical coordinate system, so
element positions and sizes remain authored in viewBox units. The
transform is reset to identity (animated 200 ms ease-out) on every
floor change.

Pan range is clamped: at `scale > 1` the scaled plan must fill at
least 50 % of the viewport (you can scan over edges but not push the
plan into the void); at `scale < 1` (only when `zoom_min` is set
below 1) at least 50 % of the plan must stay inside the viewport.

See [`docs/examples/mobile-ux.yaml`](docs/examples/mobile-ux.yaml) for
a complete example, and
[`specs/features/pan-zoom-interactions.md`](specs/features/pan-zoom-interactions.md)
for the deeper design.

### Fullscreen mode

Available from v0.2.0. A corner button (default top-right) promotes the
card to the full viewport via CSS `position: fixed; inset: 0; z-index:
9999`. Three exit paths:

- The same button (icon flips to `mdi:fullscreen-exit`)
- The Escape key (desktop)
- The browser back gesture (a history `pushState` is registered on
  enter, `popstate` triggers exit — Android back gesture works
  out of the box without leaving the dashboard)

State preservation is total: visible overlays, current floor, theme,
and the pan-zoom transform survive both directions of the toggle.

In fullscreen the layout reflows to a flex column — overlay buttons
stick at the viewport edges (with a semi-transparent dark
background) and the floor stack uses a JS-driven aspect-fit so it
never overflows in landscape. The body scroll behind the card is
locked while fullscreen is active and restored on exit.

Set `fullscreen_button: never` to hide the button entirely. The four
`*_position` values cover the four corners — pair `bottom-*` with
`overlay_buttons_position: top` if you don't want a visual collision
when the bar appears at the bottom.

### Overlay readability

Available from v0.2.0. Two improvements to how icons and text scale
across screen sizes and zoom levels:

**1. viewBox-relative defaults.** When `overlay_size_unit: viewbox`
(the default, backward-compatible with v0.1.x), the default icon
size is `viewBoxWidth / 40` and the default text font size is
`viewBoxWidth / 80`. For a typical `0 0 1920 1080` viewBox these
match the v0.1.x hard-coded `48` / `24` exactly — no behaviour
change. For unusual viewBoxes (e.g. `0 0 200 100`) the defaults now
produce sensible sizes instead of huge elements covering the plan
(this fixes a v0.1.x bug, see ADR-006).

**2. Screen-space sizing mode.** `overlay_size_unit: px`
re-interprets `size` and `font_size` as **screen pixels**. The
internal SVG units are inverse-compensated against the
viewBox-to-screen ratio AND the pan-zoom scale, so an icon
configured at `size: 32` renders at exactly 32 screen pixels
regardless of the card width or current zoom level. The defaults in
`px` mode are 32 px for icons and 14 px for text.

Both modes respect a screen-pixel floor: `min_icon_px` and
`min_text_px`. When the rendered size would otherwise fall below
the floor (e.g. tiny card width, or `size: 8` in `px` mode), the
floor wins.

```yaml
settings:
  overlay_size_unit: px        # recommended for new v0.2.0+ configs
  min_icon_px: 24
  min_text_px: 14
overlays:
  - id: lights
    elements:
      - floor: L0
        entity: light.salon
        position: { x: 600, y: 450 }
        type: icon
        # size omitted → 32 screen pixels by default
```

**Migration note**: when switching from `viewbox` to `px`, existing
`size` / `font_size` values change semantics (viewBox units → screen
px). A `size: 48` in viewBox mode becomes `size: 48` in px mode that
will render way bigger on a typical embedded card. The recommended
approach is to drop explicit `size` / `font_size` on switch and let
the new defaults take over.

### Overlay

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | ✅ | — | Unique among overlays |
| `name` | string | ✅ | — | Shown on the toggle button |
| `icon` | string (MDI) | ❌ | `mdi:layers` | Toggle button icon + element fallback |
| `default_visible` | boolean | ❌ | `false` | Initial visibility |
| `elements` | array | ✅ | — | List of element placements |

### Element (common)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `floor` | string | ✅ | id of a declared floor |
| `entity` | string | ✅ | HA entity_id |
| `position` | object | ✅ | `{ x: number, y: number }` in viewBox coordinates |
| `type` | enum | ✅ | `icon` or `text` |
| `tap_action` | string/object | ❌ | HA-standard action; default `more-info` |

### Element type `icon`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `icon` | string (MDI) | overlay's `icon` → domain default | Glyph in the pastille |
| `size` | number | mode-dependent (see below) | Pastille diameter. Unit follows `settings.overlay_size_unit` (v0.2.0+) |

Default for `size` (v0.2.0+):
- `overlay_size_unit: viewbox` (default) — `viewBoxWidth / 40` viewBox
  units. For a `0 0 1920 1080` viewBox this is `48`, matching v0.1.x.
- `overlay_size_unit: px` — `32` screen pixels (compensated against
  viewBox-to-screen ratio and pan-zoom scale).

The icon's color is derived from the entity's domain and state via CSS
variables (see [Theming](#theming)).

### Element type `text`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `unit` | string | entity's `unit_of_measurement` | Suffix appended to the value |
| `precision` | number | `1` | Decimal places (numeric values only) |
| `font_size` | number | mode-dependent (see below) | Font size. Unit follows `settings.overlay_size_unit` (v0.2.0+) |

Default for `font_size` (v0.2.0+):
- `overlay_size_unit: viewbox` (default) — `viewBoxWidth / 80` viewBox
  units. For a `0 0 1920 1080` viewBox this is `24`, matching v0.1.x.
- `overlay_size_unit: px` — `14` screen pixels (compensated; same logic
  as icon `size`).

`unavailable` and `unknown` states render as `—`.

### Tap actions

Format identical to the [HA action standard](https://www.home-assistant.io/dashboards/actions/).

Short form (string) :

```yaml
tap_action: toggle
```

Long form (object) :

```yaml
tap_action:
  action: call-service
  service: light.turn_on
  service_data:
    entity_id: light.salon
    brightness: 200
```

Supported actions: `toggle`, `more-info`, `navigate`
(with `navigation_path`), `call-service` (with `service` + `service_data`),
`url` (with `url_path`), `none`.

---

## Examples

See [`docs/examples/`](docs/examples) for complete configurations :

- **[minimal.yaml](docs/examples/minimal.yaml)** — single floor, no overlays
- **[full-house.yaml](docs/examples/full-house.yaml)** — 3 floors with lights,
  temperatures, presence, and infrastructure overlays (uses the v0.2.0
  `overlay_size_unit: px` recommended baseline)
- **[mobile-ux.yaml](docs/examples/mobile-ux.yaml)** — v0.2.0 mobile UX
  overhaul: pan-zoom limits, fullscreen button, screen-space overlay
  sizing
- **[dark-mode.yaml](docs/examples/dark-mode.yaml)** — v0.1.1 `backgrounds:
  { default, dark }` per floor + the `dark_mode` cascade
- **[themed.yaml](docs/examples/themed.yaml)** — using `card-mod` to override
  CSS variables for custom colors

---

## Theming

The card exposes a set of CSS custom properties on its `:host`. Override them
through your Lovelace theme or via [card-mod](https://github.com/thomasloven/lovelace-card-mod).

```yaml
type: custom:floor-navigator-card
# … floors / overlays …
card_mod:
  style: |
    :host {
      --fn-color-light-on: #ff8c00;
      --fn-pastille-halo: rgba(0, 0, 0, 0.6);
      --fn-floor-indicator-bg: rgba(20, 20, 20, 0.9);
    }
```

Defaults (see [src/styles/card-styles.ts](src/styles/card-styles.ts) for the
full list) :

| Variable | Default | Purpose |
|----------|---------|---------|
| `--fn-color-on` | `rgb(255, 193, 7)` | Generic active state |
| `--fn-color-off` | `rgb(120, 120, 120)` | Generic inactive state |
| `--fn-color-unavailable` | `rgb(180, 80, 80)` | Unavailable / unknown |
| `--fn-color-light-on` | `rgb(255, 193, 7)` | Override for `light.*` on |
| `--fn-color-switch-on` | `rgb(76, 175, 80)` | Override for `switch.*` on |
| `--fn-color-binary_sensor-on` | `rgb(33, 150, 243)` | Override for `binary_sensor.*` on |
| `--fn-color-text` | `#fff` | Text-element fill |
| `--fn-color-icon-foreground` | `#fff` | Icon glyph color inside pastille |
| `--fn-pastille-halo` | `rgba(255, 255, 255, 0.85)` | Pastille white ring |
| `--fn-floor-indicator-bg` | `rgba(0, 0, 0, 0.6)` | Floor indicator pill background |
| `--fn-overlay-button-bg` | `rgba(0, 0, 0, 0.5)` | Overlay button (inactive) |
| `--fn-overlay-button-active-bg` | `rgba(255, 193, 7, 0.8)` | Overlay button (active) |

---

## Development

```bash
npm install
npm run watch    # rebuilds on save → dist/floor-navigator.js
npm run lint     # tsc --noEmit (type-check only)
npm run build    # production minified bundle
```

For live testing without a running HA instance, see
[`dev/index.html`](dev/index.html) — a standalone sandbox with a mock `hass`
object and 5 fake entities. Serve from the repo root :

```bash
npx serve .
# open http://localhost:3000/dev/
```

For testing against a real HA instance, configure `HA_LOCAL_DIR` in
`.env.local` (see [`.env.local.example`](.env.local.example)) so `npm run watch`
writes the bundle directly into the HA share. Full workflow documented in
[`docs/SPEC.md` §6](docs/SPEC.md).

---

## License

MIT — see [LICENSE](LICENSE).
