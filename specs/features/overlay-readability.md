---
status: draft
owner: Johann Blais
last_updated: 2026-05-06
related: [data-model.md, color-scheme.md, mobile-fullscreen-mode.md, pan-zoom-interactions.md, ../architecture/rendering-strategy.md, ../architecture/component-tree.md]
---

# Overlay Readability

Screen-space sizing for overlay icons and text, and viewBox-relative
defaults that resolve the v0.1.x hard-coded-sizes bug. Spec for
**v0.2.0**.

## Context

v0.1.0 sizes overlay elements in viewBox units: `size: 48` for
icons and `font_size: 24` for text, both hard-coded in
`<fn-element-icon>` and `<fn-element-text>`. These defaults are
calibrated for a typical 1920×1080 viewBox.

Two problems result:

1. **BACKLOG bug**: for users with very different viewBoxes (e.g.
   `0 0 200 100`), the hard-coded defaults produce huge elements
   that cover the plan. Documented in BACKLOG.md as a known issue
   pre-promotion.

2. **Mobile illegibility**: on a phone in portrait, the card
   typically renders at ~390 px wide. With a 1920×1080 viewBox,
   `size: 48` becomes 48 × (390/1920) = **9.75 px on screen** for
   icons, and `font_size: 24` becomes ~5 px for text — illegible.

3. **Future zoom amplification** (per
   [`pan-zoom-interactions.md`](pan-zoom-interactions.md)): when
   pan-zoom ships, viewBox-unit sizes scale with the zoom transform.
   At `scale: 4`, icons become 4× larger; at `scale: 0.5` (if
   `zoom_min < 1`), they become tiny. Without compensation, the
   user's zoom is fighting the readability we are trying to give
   them.

This spec introduces **screen-space sizing**: sizes interpreted as
screen pixels, inverse-compensated against both the viewBox-to-screen
ratio AND the pan-zoom scale, so elements stay at a constant pixel
size on screen regardless of card width or zoom level.

It also fixes the BACKLOG bug for users staying in viewBox-unit
mode by making the defaults relative to viewBox dimensions.

Per ADR-006 arbitration #3, overlay text is **always visible**
(no zoom-threshold hiding, no tap-to-reveal popover) — minimum
sizes ensure legibility from the default state onwards.

## Goals

1. Resolve the BACKLOG hard-coded-sizes bug via viewBox-relative
   defaults
2. Add a screen-pixel sizing mode that compensates for both screen
   width and pan-zoom scale
3. Provide minimum-size floors in screen pixels to guarantee
   legibility regardless of mode
4. Backward-compatible: v0.1.x configs keep working with the same
   defaults; opt-in to the new mode is explicit
5. Single source of truth for `viewBox_to_screen_ratio` shared with
   pan-zoom

## Scope

### In

- New `settings.overlay_size_unit: viewbox | px` (default
  `viewbox` for backward compatibility)
- viewBox mode: defaults computed from viewBox dimensions
  (`viewBoxWidth / 40` for icons, `viewBoxWidth / 80` for text)
- px mode: `size` and `font_size` interpreted as screen pixels,
  inverse-compensated against viewBox-to-screen ratio AND
  pan-zoom scale
- `settings.min_icon_px` and `settings.min_text_px` minimum-size
  floors in screen pixels
- ResizeObserver on the card root to drive reactive recomputation
  of `viewBox_to_screen_ratio`
- Single-source-of-truth ratio shared with
  [`pan-zoom-interactions.md`](pan-zoom-interactions.md)

### Out

- Tap-to-detail / popover for overlay values — explicitly rejected
  per ADR-006 arbitration #3 ("text always visible"). May reappear
  in a future spec if user feedback shifts.
- Hover tooltips — separately listed in roadmap v0.2.0
- Per-element `overlay_size_unit` override — keep it global in
  v0.2.0, revisit if user feedback warrants
- Density-based culling (showing fewer elements at low zoom) — out
  of scope, manual control via overlay toggle
- Vector-effect tricks (`vector-effect: non-scaling-stroke`) — only
  handles strokes, not full element sizing

## Expected behaviour

### Sizing modes

Driven by `settings.overlay_size_unit`:

| Mode | Semantics |
|---|---|
| `viewbox` (default in v0.1.x configs) | `size` and `font_size` are viewBox units. Element scales with the card and with pan-zoom. |
| `px` (recommended for v0.2.0+ configs) | `size` and `font_size` are screen pixels. Element stays at constant screen size regardless of card width or zoom. |

The default value is `viewbox` to preserve backward compatibility
with v0.1.x configs (no behaviour change on upgrade). New configs
created from v0.2.0+ examples should use `px`.

### viewBox mode behaviour (default)

For an element with `size: S`:

- SVG circle radius: `S / 2` viewBox units
- Element scales linearly with the card width AND with pan-zoom
  scale

Defaults when `size` / `font_size` is not specified:

- Icon: `viewBoxWidth / 40`
- Text font: `viewBoxWidth / 80`

Examples:

| viewBox | Default icon size (viewBox units) | Default text font (viewBox units) |
|---|---|---|
| `0 0 1920 1080` | 48 | 24 |
| `0 0 200 100` | 5 | 2.5 |
| `0 0 4000 3000` | 100 | 50 |

This **resolves the BACKLOG bug**: users with non-standard
viewBoxes get sensibly-sized defaults instead of the hard-coded
48 / 24 that produce huge elements on small viewBoxes.

For `0 0 1920 1080` (the typical case), the new defaults match
the v0.1.x values exactly — no visible change for existing users.

### px mode behaviour

For an element with `size: S`:

- Compute `viewBox_to_screen_ratio = viewBoxWidth / cardWidthPx`
- Compute compensation: `compensated = S × viewBox_to_screen_ratio / zoomScale`
- SVG circle radius: `compensated / 2` viewBox units
- The rendered size in screen pixels is `S` regardless of the card
  width or pan-zoom scale

Same logic for `font_size` on text elements (applied to the SVG
`font-size` attribute).

Defaults when `size` / `font_size` is not specified:

- Icon: 32 px
- Text font: 14 px

Worked example:

| Card width | viewBox | Scale | size: 32 px → SVG `r` |
|---|---|---|---|
| 1920 px | 0 0 1920 1080 | 1 | 16 viewBox units (= 32 ÷ 2) |
| 800 px | 0 0 1920 1080 | 1 | 38.4 viewBox units (rendered = 32 px) |
| 800 px | 0 0 1920 1080 | 2 | 19.2 viewBox units (rendered = 32 px) |
| 400 px | 0 0 1920 1080 | 4 | 19.2 viewBox units (rendered = 32 px) |

The rendered screen size stays constant at 32 px in every case.

### Minimum-size floors

Configured via:

| Field | Type | Default | Description |
|---|---|---|---|
| `min_icon_px` | number | `24` | Minimum rendered icon size in screen pixels |
| `min_text_px` | number | `14` | Minimum rendered text font size in screen pixels |

Applied **after** mode-specific computation:

- viewBox mode: at the current card width (and zoom), if the
  rendered size in pixels falls below the floor, scale up the
  SVG attribute so the rendered size equals the floor
- px mode: the configured `size` is already in pixels, so the
  floor only applies if `size < min_icon_px` (a user explicitly
  chose a tiny size); the floor overrides

In viewBox mode the floor is the safety net for tiny viewBoxes or
narrow card widths. In px mode it caps the user from
foot-gunning sub-legible sizes.

### Reactive recomputation

`viewBox_to_screen_ratio` recomputed when:

- The card root resizes (covered by ResizeObserver on the
  `<floor-navigator-card>` element)
- The pan-zoom `Transform.scale` changes (already reactive via
  the controller's state)
- Fullscreen toggle (causes a card resize, picked up by
  ResizeObserver)

Implementation: a single `@state() viewBoxToScreenRatio: number`
on the card root, propagated as a prop down to elements. Lit's
shouldUpdate triggers re-renders only on the affected branch.

ResizeObserver is registered in `connectedCallback` and disconnected
in `disconnectedCallback`. Pattern consistent with other Lit
custom elements.

When the card width is `0` (hidden by parent layout), skip
recomputation — guard against division by zero.

### Configuration field semantics

| Field | Scope | Type | Default | v0.1.x backward compatibility |
|---|---|---|---|---|
| `settings.overlay_size_unit` | global | enum | `viewbox` | New field; absent → viewbox (no change) |
| `settings.min_icon_px` | global | number | `24` | New field; absent → 24 (applies in both modes) |
| `settings.min_text_px` | global | number | `14` | New field; absent → 14 (applies in both modes) |
| `IconElement.size` | per-element | number | (mode-dependent default) | v0.1.x value still works (was viewBox units; with `overlay_size_unit: viewbox`, behaviour unchanged) |
| `TextElement.font_size` | per-element | number | (mode-dependent default) | Same as `size` |

To be merged into [`data-model.md`](data-model.md) at implementation
time.

### Recommended config patterns

For new v0.2.0 configs, the recommended baseline is:

```yaml
settings:
  overlay_size_unit: px
  # min_icon_px / min_text_px keep their defaults
overlays:
  - id: lights
    elements:
      - floor: L0
        entity: light.salon
        position: { x: 600, y: 450 }
        type: icon
        # size omitted → default 32 px
```

For v0.1.x users upgrading, the no-change path is:

```yaml
# overlay_size_unit absent → 'viewbox' default → v0.1.x behaviour
```

For v0.1.x users opting into px mode without changing element
configs:

```yaml
settings:
  overlay_size_unit: px
overlays:
  - id: lights
    elements:
      - floor: L0
        entity: light.salon
        position: { x: 600, y: 450 }
        type: icon
        size: 48  # interpreted as 48 PX (screen) now, not 48 viewBox units
```

The user must explicitly migrate their `size` / `font_size`
values when switching modes — they have different semantics. Doc
example will cover this.

## Edge cases

### Element with `size: 0` or negative

Clamped to `min_icon_px` (or `min_text_px`). No error thrown.
Acceptable defensive behaviour.

### Element with `size: 9999`

In viewBox mode: rendered as 9999 viewBox units, likely larger than
the plan. Acceptable — the user explicitly chose this. No clamp at
the upper bound.

In px mode: rendered as 9999 screen pixels, likely larger than the
viewport. Same acceptance.

### Card width === 0

Hidden by parent layout (`display: none`, `visibility: hidden`).
ResizeObserver may report width 0. Skip recomputation:
`if (cardWidthPx === 0) return`. Avoids division by zero in
`viewBox_to_screen_ratio` calculations.

### Card resize during a transition

ResizeObserver fires. Recomputation is cheap (single Lit re-render
of affected elements). No debounce needed in v0.2.0.

If user feedback shows jank on rapid resizes (e.g. sidebar
expand/collapse animations), introduce 16ms debounce later.

### ResizeObserver unavailable

Very old browsers (< 2018). Fall back to `window` resize listener
+ explicit recompute on relevant lifecycle events (mount,
fullscreen toggle, floor change). Acceptable degradation.

### Mixed-unit elements in same overlay

Not supported in v0.2.0 (single global mode via
`overlay_size_unit`). Per-element override could be added in v0.2.x
if user feedback warrants — see Open questions.

### Text width measurement for centring

Text overlays use SVG `text-anchor: middle` for horizontal centring
(already in place v0.1.0). No manual width measurement is needed,
even with dynamic font size. Vertical centring uses
`dominant-baseline: middle`. Both attributes are independent of
font size.

### Pan-zoom scale at extreme values

At `scale: 4` in px mode with a 1920 viewBox in a 400 px card:

- `viewBox_to_screen_ratio = 1920 / 400 = 4.8`
- compensation = `S × 4.8 / 4 = 1.2 × S`
- For `size: 32`, SVG `r = 19.2` viewBox units
- Rendered: 19.2 × (400 / 1920) × 4 (zoom) = 32 × 1 = 32 px ✓

At `scale: 0.5` (if `zoom_min < 1`):

- compensation = `S × 4.8 / 0.5 = 9.6 × S`
- SVG `r = 153.6` viewBox units (large)
- Rendered: 153.6 × (400/1920) × 0.5 = 32 px ✓

Algorithm holds at extremes.

### Element inside an overlay that becomes invisible

Per [`overlays-toggle.md`](overlays-toggle.md), an overlay can be
toggled hidden (`display: none` on the layer). Hidden elements
do not need size compensation (they're not rendered). Lit
naturally skips them. No explicit handling needed.

### v0.1.x config with `size: 100` (large legacy value)

User had `size: 100` (viewBox units) in v0.1.0. Upgrades to v0.2.0
without changing config. `overlay_size_unit` defaults to `viewbox`
→ size stays 100 viewBox units → identical rendering to v0.1.0.
Backward compatibility preserved.

If they later set `overlay_size_unit: px`, the same `size: 100`
becomes 100 screen pixels — likely visually larger than before on
a typical card width, but the user explicitly opted into the new
mode. Documented migration in README.

### Theme switch (light/dark) mid-render

`viewBox_to_screen_ratio` is unaffected by theme. The theme switch
crossfade (per [`dark-mode.md`](dark-mode.md)) is on opacity only,
not size. No interaction.

### Multiple instances of the card on the same dashboard

Each instance has its own ResizeObserver and its own
`viewBoxToScreenRatio` state. No state shared. No conflict.

### Standalone dev mode

`dev/index.html` renders the card without HA. ResizeObserver
works in browsers same as in HA. No special handling.

## Open questions

- **Per-element `overlay_size_unit` override**: should an element
  be able to opt out of the global mode? Current proposal: no, keep
  it simple. Revisit if user feedback warrants. Could be added as
  a non-breaking extension.
- **`min_*_px` floors in viewBox mode**: should they always apply,
  or only when the rendered size would otherwise fall below the
  floor? Current proposal: always check, apply only when violated
  (i.e., act as a clamp, not as a forced minimum). To confirm at
  implementation.
- **Default for `overlay_size_unit` in v0.2.0+ scaffolded examples**:
  `px` is recommended in the YAML examples and README, but the
  implicit default for a config without the field stays `viewbox`
  for backward compatibility. v0.3.0 could flip the default to
  `px` if the migration is judged complete (would be a SemVer
  minor breaking change at that point).
- **Stroke width of icon paths**: MDI icons use stroke-based and
  fill-based paths. Stroke width currently scales with `size`.
  When in px mode at high zoom, strokes may become too thin. Test
  at implementation; may need a minimum stroke width.

## Decisions

- **Single global mode via `overlay_size_unit` rather than
  per-element**: simpler YAML, single mental model. Per-element
  override is a non-breaking extension if user feedback warrants.
- **Default `viewbox` for backward compatibility**: v0.1.x configs
  upgrade with no visible change. `px` is recommended for new
  configs and documented as such.
- **viewBox-relative defaults (`viewBoxWidth / 40` and
  `viewBoxWidth / 80`) replace the hard-coded 48 / 24**: resolves
  the BACKLOG bug. For the typical 1920×1080 viewBox, the values
  match exactly — no behaviour change for existing users. For
  unusual viewBoxes (200×100, 4000×3000), the new defaults produce
  sensible sizes.
- **Inverse-scale compensation rather than CSS
  `vector-effect: non-scaling-stroke`**: the latter only handles
  stroke widths, not full element sizing (radius, font-size). We
  need full size compensation.
- **Single source of truth for `viewBox_to_screen_ratio`**: shared
  with [`pan-zoom-interactions.md`](pan-zoom-interactions.md), one
  ResizeObserver on the card root. Avoids duplicate computation
  and inconsistencies.
- **Always-visible text per ADR-006 arbitration #3**: no
  zoom-threshold hiding, no tap-to-reveal. Minimum sizes guarantee
  legibility from default rendering. The user prefers spatial
  overview at a glance.
- **No element-level pixel-density tuning**: keep v0.2.0 scope
  bounded. Global `min_*_px` is the only floor. Element-level
  overrides if needed in v0.2.x.
