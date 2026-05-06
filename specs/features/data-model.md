---
status: implemented
owner: Johann Blais
last_updated: 2026-05-06
related: [color-scheme.md, overlays-toggle.md, dark-mode.md, overlay-readability.md, pan-zoom-interactions.md, ../architecture/component-tree.md]
---

# Data Model

The card's public YAML API. Full schema, fields, types, defaults,
tap_actions. **Frozen spec until v1.0** — every evolution must be
backward-compatible.

## Context

The data model is the public API of the component: it is what users
write in their Lovelace YAML. It must be readable for a human editing
by hand, predictable (no surprises on default values), and consistent
with HA standard conventions (snake_case, tap_action format).

## Goals

1. YAML readability for manual editing
2. Backward compatibility through v1.0 across all fields
3. Consistency with HA conventions for tap_actions
4. Coordinates in a system isolated from the actual display
   dimensions (viewBox)

## Scope

### In

- Full YAML schema
- Types and obligation of each field
- Default values
- Tap_action format

### Out

- State colours and CSS variables (see
  [`color-scheme.md`](color-scheme.md))
- Overlay toggle mechanism (see
  [`overlays-toggle.md`](overlays-toggle.md))
- Component implementation (see
  [`../architecture/component-tree.md`](../architecture/component-tree.md))

## Expected behaviour — Conceptual structure

```
Card
├── viewbox (global coordinate system, std SVG)
├── settings (transition, navigation, dark_mode, etc.)
├── floors[] (ordered list, TOP-of-house to BOTTOM)
│   ├── id (logical identifier)
│   ├── name (displayed label)
│   └── background (short form, v0.1.0)
│       OR backgrounds.{default, dark} (extended form, v0.1.1+)
└── overlays[] (transverse global layers)
    ├── id
    ├── name
    ├── icon (for the toggle bar)
    ├── default_visible
    └── elements[]
        ├── floor (which floor this element lives on)
        ├── entity (HA entity_id)
        ├── position { x, y } (in viewBox coordinates)
        ├── type (icon | text)
        ├── tap_action (HA standard action)
        └── ... (type-specific props)
```

## Expected behaviour — Full YAML schema

```yaml
type: custom:floor-navigator-card

# Global coordinate system (standard SVG)
viewbox: "0 0 1920 1080"

# Global behaviour configuration
settings:
  transition: crossfade            # crossfade | slide | slide-scale
  transition_duration: 400         # ms, 100-2000
  start_floor: L0                  # id of a declared floor
  navigation_mode: both            # wheel | swipe | both | none
  edge_behavior: bounce            # bounce | none | loop
  show_floor_indicator: true
  overlay_buttons_position: bottom # top | bottom | none
  dark_mode: auto                  # auto | on | off  (v0.1.1+, see dark-mode.md)
  overlay_size_unit: viewbox       # viewbox | px      (v0.2.0+, see overlay-readability.md)
  min_icon_px: 24                  # screen-pixel clamp for icons (v0.2.0+)
  min_text_px: 14                  # screen-pixel clamp for text  (v0.2.0+)
  zoom_min: 1                      # min scale factor             (v0.2.0+, see pan-zoom-interactions.md)
  zoom_max: 4                      # max scale factor             (v0.2.0+)
  zoom_step: 0.1                   # Ctrl+wheel notch increment   (v0.2.0+)
  zoom_double_tap_scale: 2         # target scale on double-tap   (v0.2.0+)
  zoom_slider: right               # right | left | none          (v0.2.0+)

# Floor list (ORDER = TOP to BOTTOM in the house)
# Scrolling down moves through this list: L0 → L1 → L2
# Short form v0.1.0 (background) or extended form v0.1.1+
# (backgrounds.default + optional backgrounds.dark) — see dark-mode.md.
floors:
  - id: L0
    name: "Ground floor"
    backgrounds:
      default: /local/floorplans/L0-day.png
      dark: /local/floorplans/L0-night.png

  - id: L1
    name: "First floor"
    background: /local/floorplans/L1.png   # short form = no dark variant

  - id: L2
    name: "Office and attic"
    background: /local/floorplans/L2.png

# Overlays: transverse layers across floors
overlays:
  - id: lights
    name: Lights
    icon: mdi:lightbulb
    default_visible: true
    elements:
      - floor: L0
        entity: light.salon
        position: { x: 600, y: 450 }
        type: icon
        icon: mdi:lightbulb
        tap_action: toggle

  - id: temperature
    name: Temperatures
    icon: mdi:thermometer
    default_visible: false
    elements:
      - floor: L1
        entity: sensor.ct_chambre_alice_temperature
        position: { x: 850, y: 320 }
        type: text
        unit: "°C"
        precision: 1
```

## Expected behaviour — Field specification

### Card root

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | string | ✅ | — | Always `"custom:floor-navigator-card"` |
| `viewbox` | string | ✅ | — | Standard SVG viewBox format, e.g. `"0 0 1920 1080"` |
| `settings` | object | ❌ | defaults below | Global configuration |
| `floors` | array | ✅ | — | Ordered list of floors (min 1) |
| `overlays` | array | ❌ | `[]` | Overlay list |

### Settings

| Field | Type | Default | Values |
|---|---|---|---|
| `transition` | enum | `crossfade` | `crossfade`, `slide`, `slide-scale` |
| `transition_duration` | int (ms) | `400` | 100-2000 |
| `start_floor` | string | first floor | id of a declared floor |
| `navigation_mode` | enum | `both` | `wheel`, `swipe`, `both`, `none` |
| `edge_behavior` | enum | `bounce` | `bounce`, `none`, `loop` |
| `show_floor_indicator` | bool | `true` | — |
| `overlay_buttons_position` | enum | `bottom` | `top`, `bottom`, `none` |
| `dark_mode` | enum | `auto` | `auto`, `on`, `off` (v0.1.1+, see [`dark-mode.md`](dark-mode.md)) |
| `overlay_size_unit` | enum | `viewbox` | `viewbox`, `px` (v0.2.0+, see [`overlay-readability.md`](overlay-readability.md)) |
| `min_icon_px` | number | `24` | Minimum rendered icon size in screen pixels — clamp (v0.2.0+) |
| `min_text_px` | number | `14` | Minimum rendered text font size in screen pixels — clamp (v0.2.0+) |
| `zoom_min` | number | `1` | Minimum scale factor (v0.2.0+, see [`pan-zoom-interactions.md`](pan-zoom-interactions.md)) |
| `zoom_max` | number | `4` | Maximum scale factor (v0.2.0+) |
| `zoom_step` | number | `0.1` | Scale increment per Ctrl+wheel notch (v0.2.0+) |
| `zoom_double_tap_scale` | number | `2` | Target scale on double-tap toggle (v0.2.0+) |
| `zoom_slider` | enum | `right` | `right`, `left`, `none` — vertical slider position (v0.2.0+) |

### Floor

A floor declares its background image in **one** of two forms: short
(v0.1.0) or extended (v0.1.1+, allows a dark variant — see
[`dark-mode.md`](dark-mode.md)).

#### Short form (v0.1.0, backward-compatible)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique among floors |
| `name` | string | ✅ | Label shown in the indicator |
| `background` | string | ✅ | Path/URL to the image (PNG, JPG, SVG) |

#### Extended form (v0.1.1+)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique among floors |
| `name` | string | ✅ | Label shown in the indicator |
| `backgrounds` | object | ✅ | `{ default, dark?, ... }` |
| `backgrounds.default` | string | ✅ | Path used in `light` mode (and universal fallback) |
| `backgrounds.dark` | string | ❌ | Alternative path used in `dark` mode |
| `backgrounds.<other>` | string | ❌ | Reserved for future modes (high-contrast, sepia...). Ignored in v0.1.1. |

If both forms are set on the same floor, `backgrounds` wins and
`background` is silently ignored (acceptable transitory migration
state).

### Overlay

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | ✅ | — | Unique among overlays |
| `name` | string | ✅ | — | Label shown on the toggle button |
| `icon` | string (MDI) | ❌ | `mdi:layers` | Toggle button icon |
| `default_visible` | bool | ❌ | `false` | Initial visibility |
| `elements` | array | ✅ | — | List of elements in this overlay |

### Element (common)

| Field | Type | Required | Description |
|---|---|---|---|
| `floor` | string | ✅ | id of a declared floor |
| `entity` | string | ✅ | HA entity_id |
| `position` | object | ✅ | `{ x: number, y: number }` in viewBox coords |
| `type` | enum | ✅ | `icon` or `text` |
| `tap_action` | object/string | ❌ | HA standard action |

### Element type `icon`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | string (MDI) | ❌ | derived from the entity domain | MDI icon to display |
| `size` | int | ❌ | mode-dependent (see below) | Icon square size. Unit follows `settings.overlay_size_unit` (v0.2.0+). |

Default for `size` (v0.2.0+):
- `overlay_size_unit: viewbox` (default): `viewBoxWidth / 40` viewBox units
  (= 48 for the typical 1920×1080 viewBox — matches v0.1.x exactly).
- `overlay_size_unit: px`: 32 screen pixels (compensated against the
  viewBox-to-screen ratio and pan-zoom scale; see
  [`overlay-readability.md`](overlay-readability.md)).

### Element type `text`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `unit` | string | ❌ | entity's `unit_of_measurement` | Suffix shown |
| `precision` | int | ❌ | `1` | Number of decimals |
| `font_size` | int | ❌ | mode-dependent (see below) | Font size. Unit follows `settings.overlay_size_unit` (v0.2.0+). |

Default for `font_size` (v0.2.0+):
- `overlay_size_unit: viewbox` (default): `viewBoxWidth / 80` viewBox units
  (= 24 for the typical 1920×1080 viewBox — matches v0.1.x exactly).
- `overlay_size_unit: px`: 14 screen pixels (compensated; same logic as
  icon `size`).

## Expected behaviour — Tap actions

Format identical to HA standard. See
https://www.home-assistant.io/dashboards/actions/

### Short form (string)

```yaml
tap_action: toggle
```

### Long form (object)

```yaml
tap_action:
  action: call-service
  service: light.turn_on
  service_data:
    entity_id: light.salon
    brightness: 200
```

### Actions supported in v0.1.0

- `toggle`
- `more-info`
- `navigate` (with `navigation_path`)
- `call-service` (with `service` + `service_data`)
- `url` (with `url_path`)
- `none`

### Default behaviour when `tap_action` is absent

`more-info` (opens the standard HA modal). Consistent with other
custom cards in the ecosystem.

### `tap_action: none`

The icon stays visible and coloured, but does not react to clicks.
The cursor is not a pointer on hover. Use case: purely informative
elements (presence badges, AP status).

## Edge cases

### Floor referenced by an element but not declared

Element with `floor: L99` while `floors` only contains L0/L1/L2.
Behaviour: the element is rendered on no floor (silently). No
explicit error in v0.1.0. Runtime validation to harden in v0.2.0+ if
user feedback warrants (at least a console warning).

### Entity not present in HA

`entity: light.nonexistent`. Behaviour: the element is rendered in
the `unavailable` state (dark red colour, `?` value for type text).
Consistent with the standard HA behaviour for missing entities.

### Position outside viewBox

`position: { x: 9999, y: 9999 }` while
`viewbox: "0 0 1920 1080"`. Behaviour: the element is rendered but
out of view. No error. SVG handles out-of-viewBox coordinates
naturally without clipping by default.

### Negative coordinates

`position: { x: -50, y: -50 }`. Behaviour: the element is rendered
top-left, partially out of view. No error. Rare but valid use case
(intentional overflow).

### Float vs int on `precision`

`precision: 1.5`. Behaviour: truncated to 1 (Math.floor) before use
in `toFixed()`. No explicit error. YAML good practice: use integers.

### Multiple elements with the same `entity` across different overlays

`light.salon` appears in overlay `lights` AND overlay `energy`. Both
elements are rendered independently (positions and props
independent). No conflict. See BACKLOG.md for the use case to
document.

## Open questions

None.

## Decisions

The data model was frozen at the start of the design session
(2026-05-01) without individual ADRs. The structuring choices were:

- **Global transverse overlays** (vs one overlay per floor): allows
  semantic grouping (all lights in a single overlay) and consistent
  toggling
- **viewBox coordinates** (vs percentages or absolute pixels):
  isolates positions from the card's actual dimensions, scales
  naturally
- **tap_action HA standard format** (vs custom format): direct
  compatibility with `custom-card-helpers`, no surprise for users
- **Scroll-aligned convention** (down → next): intuitive on desktop
  AND mobile, aligned with classic page scrolling
