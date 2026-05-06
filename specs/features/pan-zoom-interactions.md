---
status: implemented
owner: Johann Blais
last_updated: 2026-05-06
related: [mobile-fullscreen-mode.md, overlay-readability.md, data-model.md, ../architecture/navigation.md, ../architecture/rendering-strategy.md, ../architecture/component-tree.md]
---

# Pan-Zoom Interactions

Unified zoom and pan engine for the active floor. Multi-source input:
pinch (mobile), Ctrl+wheel (desktop), double-tap, vertical slider.
Spec for **v0.2.0**.

## Context

v0.1.0 has wheel-based floor navigation on desktop and single-finger
swipe on mobile, but no way to zoom into a detailed plan to inspect
a small overlay or a corner of the house. The
`<fn-navigation-controller>` sets `touch-action: none` on the root
container and cancels gesture tracking as soon as
`e.touches.length > 1` (see
[`../architecture/navigation.md`](../architecture/navigation.md)
"Pinch-to-zoom gesture" edge case). This makes pinch impossible by
design.

This spec introduces a transform engine that supports zoom and pan
on the active floor while preserving the existing floor-navigation
behaviour. The 4 input sources (pinch, Ctrl+wheel, double-tap,
slider) all converge to the same `Transform` state, per ADR-006
arbitration #2.

The transform is applied via CSS `transform: translate(x, y) scale(z)`
on a wrapper around `<fn-floor-stack>`. The viewBox stays the
canonical coordinate system for element positions — the transform
is purely visual. This is consistent with
[`../architecture/rendering-strategy.md`](../architecture/rendering-strategy.md)
which already isolates positions from display dimensions via the
viewBox.

## Goals

1. Unified `Transform` state across all input sources
2. Preserve existing wheel-based floor navigation (wheel without
   modifier = navigate, Ctrl+wheel = zoom)
3. Pinch on mobile, Ctrl+wheel on desktop, double-tap, slider — all
   converge to the same state machine
4. Don't break tap_action on overlay elements (multi-finger gesture
   does not trigger element clicks)
5. Predictable bounds (clamp at min/max zoom, clamp pan to plan
   bounds)
6. Reset zoom/pan on floor change (scoped per active floor)

## Scope

### In

- `Transform` state at the controller level: `{ scale, x, y }`
- 4 input sources: pinch, Ctrl+wheel, double-tap, slider
- Single-finger drag for pan when `scale > 1` (single-finger drag
  for floor swipe when `scale === 1` — existing behaviour preserved)
- Vertical zoom slider on the side of the card, always visible
  (per ADR-006)
- Configurable slider position (`right`, `left`, `none`)
- CSS transform applied to `<fn-floor-stack>` wrapper
- `<fn-navigation-controller>` rewrite from `touchstart/move/end`
  with `touch-action: none` to PointerEvents with manual gesture
  handling
- Reset to identity transform on floor change (animated 200ms)
- New configuration fields for zoom limits and slider visibility

### Out

- Per-floor independent zoom state — single transform shared, reset
  on floor change. Per-floor state would surprise users.
- 3D / perspective zoom — see roadmap v0.4.0+
- Drag-and-drop element editing — permanent non-goal as WYSIWYG
- Modifying the SVG `viewBox` attribute dynamically — we apply CSS
  transform on a wrapper, viewBox stays constant
- Pinch zoom on overlay buttons or the floor indicator — gesture is
  gated to the floor stack area
- Inertial scrolling / momentum on pan — keep simple for v0.2.0,
  revisit if user feedback warrants

## Expected behaviour

### Transform state

Single `Transform` state held on the card root component:

```ts
interface Transform {
  scale: number   // ∈ [zoom_min, zoom_max], default 1
  x: number       // pan offset in viewBox X units
  y: number       // pan offset in viewBox Y units
}
```

Default value: `{ scale: 1, x: 0, y: 0 }` (identity).

Applied to `<fn-floor-stack>` via CSS:

```css
transform: translate(${x}px, ${y}px) scale(${scale});
transform-origin: 0 0;
```

The `x` and `y` are converted from viewBox units to screen pixels at
render time using the card's `viewBox_to_screen_ratio`. The same
ratio is used by [`overlay-readability.md`](overlay-readability.md)
for screen-space sizing — single source of truth via
ResizeObserver on the card root.

### Limits

Configured via:

| Field | Default | Description |
|---|---|---|
| `zoom_min` | 1 | Minimum scale factor |
| `zoom_max` | 4 | Maximum scale factor |
| `zoom_step` | 0.1 | Scale increment per Ctrl+wheel notch |
| `zoom_double_tap_scale` | 2 | Target scale for double-tap toggle |

Scale clamped to `[zoom_min, zoom_max]`.

Pan clamped with a two-branch rule depending on scale (per
implementation in `src/utils/transform.ts`, post-2026-05-06 fix):

- **scale > 1** — the visible portion of the plan must fill **≥ 50%
  of the viewport area**. Equivalent phrasing: "the scaled plan never
  leaves more than 50% of the viewport empty". This formulation
  degrades gracefully at high zoom: at `scale: 4` the user sees at
  most ~25% of the plan at a time but the viewport is always
  half-filled by plan content.

  In viewBox-translation units (`tx = transform.x`):
  ```
  tx ∈ [W·(0.5 − scale), W·0.5]
  ```
  Equivalently in `panX = "viewBox X-coord at viewport's left" =
  −tx/scale`:
  ```
  visibleViewBoxWidth = viewBoxWidth / scale
  maxPanX = viewBoxWidth − visibleViewBoxWidth/2
  minPanX = −visibleViewBoxWidth/2
  ```
  (the two formulas are mathematically identical; the viewBox-tx
  form is what `clampPan` uses).

- **scale < 1** (`zoom_min < 1` configurations) — the plan is
  smaller than the viewport. Keep ≥ 50% of the plan inside the
  viewport. Range:
  ```
  tx ∈ [−W·scale/2, W·(1 − scale/2)]
  ```

- **scale === 1** — pan forced to `{ x: 0, y: 0 }` (no point
  panning a plan that already fits, and single-finger drag falls
  through to floor swipe at this scale).

(symmetric for Y in both branches).

Note: the v0.2.0 spec draft phrased the rule as "50% of the plan
outside" / "50% of plan stays in view", which collapses at
`scale ≥ 2` (the plan can geometrically only show ≤ 50% of itself
at a time). The "50% viewport filled" phrasing above is what was
actually intended and what ships.

### Input source: pinch (mobile, 2 fingers)

Two pointers down → enter pinch mode. Track:

- Initial centroid position `c0` (in viewBox coords)
- Initial distance `d0` between pointers
- Initial transform `T0`

On every `pointermove` (with both pointers active):

- Current centroid `c` and distance `d`
- New scale `s = T0.scale × (d / d0)`, clamped to `[zoom_min, zoom_max]`
- Anchor zoom around `c0`: pan adjusted so the point at `c0` in the
  plan stays under `c` on screen
- Pan additionally translated by centroid drift `(c - c0)`

On `pointerup` (one pointer lifted):

- If remaining pointer continues moving: degrade to single-finger
  pan (when `scale > 1`) or release (when `scale === 1`)
- If both lifted simultaneously: end pinch, transform settled

### Input source: wheel (desktop)

Existing behaviour preserved when no modifier:

- `wheel` without Ctrl → floor navigation, throttled 400ms (current
  spec, see [`../architecture/navigation.md`](../architecture/navigation.md))

New behaviour with Ctrl held:

- `Ctrl+wheel` → zoom around cursor position
- `deltaY < 0` → scale × (1 + zoom_step) (zoom in)
- `deltaY > 0` → scale × (1 - zoom_step) (zoom out)
- Pan adjusted so the viewBox point under the cursor stays under
  the cursor after the zoom (same anchor logic as pinch)
- No throttle on Ctrl+wheel (smooth continuous zoom)

The `Ctrl` modifier is the standard convention for zoom (Google
Maps, browsers, image viewers). Users on macOS use Cmd+wheel which
also produces `e.ctrlKey === true` in browser events.

### Input source: double-tap / double-click

Tap twice within 300ms on the floor stack (and not on an overlay
element):

- If `scale === 1`: zoom to `zoom_double_tap_scale` (default 2)
  centred on the tap point
- If `scale > 1`: reset to `{ scale: 1, x: 0, y: 0 }`

Animated transition 200ms (ease-out).

The 300ms threshold is intentional, slightly longer than the
browser's 250ms native double-tap detection — gives the user a bit
more leeway, and we override the native handling anyway.

### Input source: zoom slider

Vertical slider rendered as an SVG overlay on the card.

- Position: configurable via `settings.zoom_slider`
  (`right` default, `left`, `none`)
- Always visible regardless of viewport size or current scale
  (per ADR-006). Even at `scale === 1` it shows the position at
  minimum, indicating the feature exists.
- Range: `zoom_min` to `zoom_max`, linear mapping
- Drag interaction: pointerdown on the slider thumb, pointermove
  updates scale, pointerup releases
- Bidirectional: slider thumb position reflects current scale, and
  changes via other inputs update the thumb
- Zoom anchor when slider is the input source: card centre (no
  cursor / touch position to anchor to)
- Reset button (small `mdi:fit-to-page-outline` icon) at the bottom
  of the slider — tap to reset to identity transform with 200ms
  animation

### Input source: single-finger drag (mobile)

Behaviour depends on current scale:

- `scale === 1`: single-finger drag = floor swipe (existing
  v0.1.0 behaviour, see
  [`../architecture/navigation.md`](../architecture/navigation.md))
- `scale > 1`: single-finger drag = pan. Translate transform by
  drag delta.

This conditional dispatch happens in the controller's gesture
state machine. Threshold for swipe vs pan: same 50px / 0.3 px/ms
as v0.1.0.

When transitioning from `scale > 1` back to `scale === 1` (e.g.
via slider or double-tap), single-finger drag reverts to swipe.

### `touch-action` and PointerEvents

The current `touch-action: none` is replaced. The controller
subscribes to PointerEvents:

- `pointerdown`, `pointermove`, `pointerup`, `pointercancel`,
  `pointerleave`
- Calls `setPointerCapture` on each pointer to handle drift outside
  the card boundary
- Tracks active pointers in a `Map<pointerId, PointerInfo>`

`touch-action` on the floor stack:

- `touch-action: none` on the wrapper that hosts gesture detection
  (still needed to prevent native scroll / pinch in the iframe)
- Native two-finger pinch on the page outside the card area is
  unaffected (the user can still pinch the dashboard itself)

### Reset on floor change

When `currentFloorIndex` changes (via wheel, swipe, or programmatic):

- Animate transform back to `{ scale: 1, x: 0, y: 0 }` over 200ms
  (ease-out)
- The animation runs concurrently with the floor transition (which
  is on a different property — see
  [`../architecture/rendering-strategy.md`](../architecture/rendering-strategy.md)),
  no conflict

The reset is mandatory: per-floor scoped zoom would surprise users
(zoom into the kitchen on L0, switch to L1, find L1 zoomed somewhere
unrelated). Per ADR-006.

### Tap vs zoom vs swipe discrimination

The browser-native ~10px click threshold from
[`../architecture/navigation.md`](../architecture/navigation.md)
("Tap vs swipe discrimination") still applies. New rules:

| Input | Result |
|---|---|
| 1 finger, < ~10px movement, < 300ms, single | Tap → element click / overlay button |
| 1 finger, < ~10px movement, < 300ms, second within 300ms | Double-tap → zoom toggle |
| 1 finger, > 50px movement OR > 0.3 px/ms, `scale === 1` | Floor swipe |
| 1 finger, any movement, `scale > 1` | Pan |
| 2 fingers down | Pinch (zoom + pan via centroid) |
| Wheel without Ctrl | Floor navigation |
| Wheel with Ctrl | Zoom around cursor |

Pinch starting on an overlay element does **not** fire the
element's tap_action: the browser does not synthesise a click event
when multiple pointers are active.

### Slider visual

- Vertical bar with rounded ends, ~6px wide, 70% of card height,
  margin 12px from the edge
- Thumb: 24×24 px circle, `var(--fn-button-bg)` background, scales
  to 32×32 on active drag
- Track: semi-transparent
  (`background: rgba(255, 255, 255, 0.15)`)
- Track-fill below the thumb: `var(--fn-color-on)`
- Reset button at the bottom: 32×32, same style as expand button
- Optional numeric percentage label on the thumb during active
  drag (e.g. "150%") — to validate at implementation review

## Configuration

New fields in `settings`:

| Field | Type | Default | Description |
|---|---|---|---|
| `zoom_min` | number | `1` | Minimum scale factor (≥ 0.5 recommended) |
| `zoom_max` | number | `4` | Maximum scale factor (≤ 8 recommended) |
| `zoom_step` | number | `0.1` | Scale increment per Ctrl+wheel notch |
| `zoom_double_tap_scale` | number | `2` | Target scale for double-tap toggle |
| `zoom_slider` | enum | `right` | `right`, `left`, `none` |

To be merged into [`data-model.md`](data-model.md) at implementation
time.

## Edge cases

### Pinch starts on an overlay element

Two-finger gesture initiated with both pointers on an overlay icon.
The element receives `pointerdown` on both, but no synthesised click
fires (browser native behaviour). The controller catches the second
`pointerdown` and enters pinch mode. The element's tap_action does
not fire. Acceptable — pinch wins.

### Pinch with one finger lifted mid-gesture

User starts pinch, lifts one finger while the other continues
moving. Behaviour: `pointerup` for the lifted pointer, controller
checks remaining pointer count.

- If `scale > 1` after the partial pinch: degrade to single-finger
  pan with the remaining pointer
- If `scale === 1`: end gesture, no swipe initiated (the remaining
  pointer's drag is treated as a continuation, not a new swipe)

### Wheel without Ctrl on mobile (rare)

External Bluetooth mouse on Android: `wheel` event fires without
Ctrl. Behaviour: triggers floor navigation as on desktop. Acceptable
— consistent with v0.1.0.

### Double-tap on a floor change cool-down

User triggers a floor change via swipe. Within the 400ms throttle,
double-taps the new floor. Behaviour: the throttle applies only to
floor navigation; double-tap zoom is independent and fires
immediately. No conflict.

### Card resize while zoomed

User toggles fullscreen (see
[`mobile-fullscreen-mode.md`](mobile-fullscreen-mode.md)) while at
`scale: 2.5`. The card grows. Transform values stay the same (in
viewBox units), but the visual zoom looks less aggressive (more
plan area visible). Acceptable — viewBox-relative semantics are
naturally consistent across resizes.

### User reaches `zoom_max` and continues pinching

Scale clamps at `zoom_max`. Pinch continues to influence pan
(centroid drift), but scale stays clamped. No elastic overshoot in
v0.2.0 — keep simple. Could add a soft 10px elastic effect at the
boundary in v0.2.x for polish.

### Plan smaller than viewport at `scale: 1`

User has a tiny viewBox (e.g. `0 0 200 100`) rendered in a wide card.
`scale === 1` already shows everything. Pan is disabled (clamped to
`{ x: 0, y: 0 }`). Single-finger drag goes to swipe-navigate.

### Slider drag during pinch

Unlikely simultaneous gesture (slider is on the side, pinch happens
on the floor area). If it occurs (multi-touch device with the user
deliberately doing both), the last input wins on a per-frame basis
— no explicit lock. The transform state has only one source of
truth, the `Transform` object, written by whichever handler fires
last. Acceptable for v0.2.0.

### Floor change while pinching

Wheel or swipe triggers floor change while pinch is active.
Behaviour: pinch wins (controller detects 2 active pointers, ignores
swipe; wheel goes to navigation but pinch is on touch, no overlap on
desktop). On mobile with simultaneous pinch + wheel via external
device: extreme edge case, not handled.

### `zoom_min < 1` (zoom out below viewport)

User configures `zoom_min: 0.5`. The plan can be made smaller than
the viewport. Pan clamping must allow the plan to be centred (or
positioned anywhere) within the larger empty space. Algorithm: at
`scale < 1`, the constraint flips — the plan stays at least 50%
inside the viewport rather than 50% inside the plan. To finalise at
implementation.

### Slider position `none` and pinch unavailable on the device

Desktop user without a touch screen, with `zoom_slider: none`
configured. They still have Ctrl+wheel and double-click to zoom.
Acceptable. Document the keyboard pattern in the YAML examples.

### Reset transform on theme change (dark mode toggle)

Probably not. Theme change is orthogonal to spatial state. To
confirm at implementation.

### History entry from fullscreen + back-button while zoomed

User enters fullscreen at `scale: 2`, presses Android back. The
fullscreen popstate listener fires, exits fullscreen. Transform
state is preserved (per `mobile-fullscreen-mode.md`). The user is
back in the embedded card at `scale: 2`. Acceptable.

## Open questions

- **Ctrl+wheel modifier**: keep `Ctrl` required, or allow plain
  wheel zoom when `scale > 1`? The current proposal is "Ctrl
  required" to avoid accidental zoom while scrolling the dashboard.
  **Status: kept Ctrl-required at implementation (2026-05-06)**.
  `e.metaKey` (Cmd on macOS) is also accepted. Revisit if user
  feedback suggests otherwise.
- **Slider visual style**: traditional thumb-and-track, or
  pinch-style numeric indicator (e.g. "150%" floating bubble)?
  **Status: shipped as thumb-and-track at implementation (2026-05-06)**.
  24×24 thumb (32×32 active), 6px-wide track, reset button at the
  bottom with `mdi:fit-to-page-outline`. Numeric overlay deferred
  to UX review.
- **Zoom limits per-floor**: a complex floor (cellar with technical
  rooms) might warrant a higher `zoom_max` than a simple floor.
  Currently global. Per-floor override deferred to v0.2.x if user
  feedback warrants.
- **Inertial pan after release** (momentum scrolling): not in
  v0.2.0 scope. Keep release as instant stop. Add in v0.2.x if
  feedback warrants.
- **Element interaction at high zoom**: at `scale: 4`, an icon at
  position `(600, 450)` is 4× further from the screen origin. The
  click area must follow. With CSS transform on the wrapper, this
  is automatic (the SVG element's bounding rect transforms with
  the wrapper). **Status: confirmed at implementation (2026-05-06)**
  — `pointer-events` and `getBoundingClientRect` behave as expected
  through the CSS transform on the floor stack.
- **Double-tap on overlay elements**: spec line 189 reads "and not
  on an overlay element". Implementation tracks `startedOnElement`
  on each pointer (composedPath check for `FN-ELEMENT-ICON` /
  `FN-ELEMENT-TEXT`) and suppresses double-tap zoom when the tap
  originated there. The element's click handler runs normally
  (entity toggle / more-info). **Status: confirmed at
  implementation (2026-05-06)**.
- **`zoom_min < 1` clamp inversion**: see resolved entry in
  `specs/open-questions.md` (2026-05-06) — implemented as
  two-branch `clampPan` in `src/utils/transform.ts`.
- **Vitest on the gesture state machine**: see open entry in
  `specs/open-questions.md` (2026-05-06). Math helpers in
  `src/utils/transform.ts` are pure functions, ready for tests in
  v0.3.0 without refactor.

## Decisions

- **CSS transform on `<fn-floor-stack>` wrapper, not viewBox
  modification**: viewBox stays the canonical coordinate system;
  CSS transform is purely visual. Element positions and sizes
  remain authored in viewBox units, simplifying both the YAML
  contract and downstream specs (overlay-readability uses the
  same `viewBox_to_screen_ratio`).
- **Reset transform on floor change**: per-floor scoped zoom would
  surprise users. Consistent reset is the safe default. Per
  ADR-006.
- **Single transform engine across all input sources**: pinch,
  Ctrl+wheel, double-tap, slider all converge to the same
  `Transform` state. No mode-specific quirks. Per ADR-006
  arbitration #2.
- **Always-visible slider**: discoverability over minimal UI. Low
  cost on desktop, useful on mobile when the user does not
  attempt pinch. Per ADR-006 arbitration #2.
- **PointerEvents instead of `touchstart/move/end` +
  `touch-action: none`**: better support for hybrid devices
  (Surface, iPad with Magic Keyboard), unifies pinch and
  single-pointer pan handling, native pointer capture for
  out-of-card drag. Note: this is a substantial rewrite of
  `<fn-navigation-controller>` — affects
  [`../architecture/navigation.md`](../architecture/navigation.md),
  to update post-implementation.
- **Single-finger drag dispatch by current scale**: at `scale: 1`,
  drag = swipe (existing UX); at `scale > 1`, drag = pan. The user
  can always pan once zoomed. Predictable.
- **Pan clamping at "50% viewport filled by plan" (scale > 1)**:
  prevents infinite drift while letting the user focus on edges.
  Equivalent to "≤ 50% of viewport empty". Replaces the v0.2.0
  draft wording "50% of plan in view", which is geometrically
  unsatisfiable at scale ≥ 2. For scale < 1, the rule flips to
  "≥ 50% of plan inside viewport". Thresholds adjustable without
  spec change.
