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

### Floor

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique among floors |
| `name` | string | ✅ | Shown in the floor indicator |
| `background` | string | ✅ | Path/URL to PNG, JPG, or SVG |

The order of `floors[]` is the navigation order : scrolling down advances to
the next item in the list.

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
| `size` | number (viewBox units) | `48` | Pastille diameter |

The icon's color is derived from the entity's domain and state via CSS
variables (see [Theming](#theming)).

### Element type `text`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `unit` | string | entity's `unit_of_measurement` | Suffix appended to the value |
| `precision` | number | `1` | Decimal places (numeric values only) |
| `font_size` | number (viewBox units) | `24` | — |

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

Supported actions in v0.1.0 : `toggle`, `more-info`, `navigate`
(with `navigation_path`), `call-service` (with `service` + `service_data`),
`url` (with `url_path`), `none`.

---

## Examples

See [`docs/examples/`](docs/examples) for complete configurations :

- **[minimal.yaml](docs/examples/minimal.yaml)** — single floor, no overlays
- **[full-house.yaml](docs/examples/full-house.yaml)** — 3 floors with lights,
  temperatures, presence, and infrastructure overlays
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
