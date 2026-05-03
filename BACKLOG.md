# Backlog

A living list of improvements, ideas, and known issues for Floor
Navigator.

This file is **distinct from the specs** in [`specs/`](specs/). The
specs describe the frozen design and the public API contract. The
backlog lists **candidates** — things we might do, not commitments.
Reorganise, promote to a spec, or drop items as priorities evolve.

## Conventions

| Tag | Meaning |
|-----|---------|
| 🐛 | Known bug or quality issue |
| ✨ | New feature, likely v0.2.x candidate |
| ⚡ | Performance or bundle-size improvement |
| 🛠 | Tooling, CI, or dev workflow |
| 🔮 | Speculative — future or maybe |

When you pick up an item, mark it with `✅` and link the PR or commit.
When an item ships, move it to a "Released in vX.Y.Z" section near the
top so it stays visible as a history trail.

---

## Released in v0.1.1

- ✅ **Dark mode for floor backgrounds.** Optional `backgrounds:
  { default, dark }` field per floor + global `dark_mode` setting.
  See [`specs/features/dark-mode.md`](specs/features/dark-mode.md)
  and ADR-005 in [`specs/decisions.md`](specs/decisions.md).

---

## 🐛 Bugs / quality

- **Swipe starting on an overlay button → navigation instead of
  toggle.** If the user starts a swipe (>50px) with their finger on
  a button in the overlay bar, the browser does not synthesise a
  click — the controller navigates and the button does not toggle.
  Consistent with the "swipe = navigate" semantic, but can surprise.
  Candidate fix: skip swipe tracking in `_onTouchStart` when
  `e.target` is inside `<fn-overlay-buttons>` (filter via
  `closest()`).

- **Default sizes for icons / text are hard-coded (48 / 24 viewBox
  units).** Sized for a 1920×1080 viewBox. For very different
  viewBoxes (e.g. `0 0 200 100`) the defaults produce huge elements.
  Candidate fix: defaults relative to the viewBox (e.g.
  `viewBoxWidth / 40`).

- **Bounce + slide-scale: the scale is temporarily lost during the
  bounce.** The animation keyframe overrides the full `transform`,
  so the active floor's `scale(1)` disappears for the 150ms of the
  bounce. Minor visual artifact. Fix: bake the scale into the
  keyframes per transition mode (or use two separate CSS properties).

---

## ✨ v0.2.x candidates

Items already listed in [`specs/README.md`](specs/README.md) under
v0.2.0 (reminder):
- Hover tooltip on elements
- `badge` element type (icon + value combined)
- Bind overlays to HA entities (`visible_entity`)
- Persist overlay state (localStorage)
- Optional CSS animations (pulse for presence, glow for alerts)
- Additional transitions (fade-up, zoom, ...)

Captured during dev:

- **`hold_action` + `double_tap_action`.**
  `handleAction` from `custom-card-helpers` already supports them.
  We just need to add `hold_action` and `double_tap_action` to
  `IconElement` (and the related types) and wire `handleClick` from
  `custom-card-helpers`, which handles tap/hold/dblclick
  discrimination.

- **Automatic cache busting.**
  Embed the git hash into the bundle at build time, surface it via
  `console.info` at load, and optionally auto-append a query string
  to the install docs. Avoids the manual `Ctrl+Shift+R` after every
  release.

- **Keyboard navigation.**
  `PageUp` / `PageDown` (or `↑` / `↓`) to navigate between floors
  when the card has focus. Accessibility win.

- **Multiple icons for the same entity across different overlays.**
  Use case: `light.salon` in the "Lights" overlay AND in the
  "Energy" overlay with a different colour. Already works in
  principle (nothing prevents it), but worth validating and
  documenting.

- **Smart duration formatting for timestamps.**
  For sensors of type `last_changed` or `_timestamp`, display "5
  min ago" instead of the raw value. Detection via
  `device_class: timestamp` or `unit_of_measurement === 'min'`.

---

## ⚡ Performance / bundle

- **Vendor the `custom-card-helpers` helpers we actually use.**
  We currently import `handleAction`, which pulls in
  `toggle-entity`, `fire-event`, `navigate`, `forwardHaptic`, and
  leaks `@formatjs/intl-utils` via the barrel exports. Total ≈ 3–4
  KB minified for ~150 lines of real logic. Reimplementing the 5–6
  helpers locally would save ~3 KB and remove the Rollup warning
  `"this" has been rewritten to "undefined"` from `@formatjs`.

- **Per-element reactivity for `fn-element-text`.**
  At present the whole overlay layer re-renders when any entity
  changes. Trivial for ~20 text elements; worth reconsidering if
  profiling shows jank with ~100+ active text overlays
  simultaneously. Solution: turn the helper into a LitElement
  (inside a foreignObject, or via a native `<g>` with a trick).

- **Lazy-load the slide / slide-scale transitions.**
  CSS for all three transitions ships in the bundle; we could split
  into conditional CSS modules per `settings.transition`. Marginal
  gain (~0.5 KB).

---

## 🛠 Tooling / chore

- **Pre-commit hook with lint + build size check.**
  Catches regressions before push. Husky + lint-staged.

- **Vitest tests** (already on the v0.3.0 roadmap).
  At minimum: unit tests for `color-resolver`, `icon-resolver`,
  `tap_action` parsing (string vs object), config validation.

- **Screenshots in `docs/screenshots/`.**
  Placeholder is in place; remains to produce `hero.png`,
  `transitions.gif`, `overlay-toggle.gif`. Out of dev scope — for
  the repo owner.

- **Live reload in dev mode.**
  Currently a manual `Ctrl+R` is needed after every rebuild. A small
  WebSocket watcher in `dev/index.html` would remove that.

- **Dependabot grouping** in `.github/dependabot.yml`: group minor /
  patch bumps of devDependencies to avoid 5 separate PRs each week.

---

## 🔮 Speculative / longer term

- **Pinch-zoom on the plan.**
  Currently blocked by `touch-action: none` on the controller. For
  very detailed plans, zoom would be useful. Implies new state
  (zoom level + pan offset) and reconciling with the viewBox
  system.

- **Drag-and-drop element positioning.**
  Edit-mode only (gated by a toggle). Sync with the YAML config.
  The spec marks the full WYSIWYG editor as "permanent non-goal",
  but a smaller "click to place" mode could be very useful.

- **3D perspective mode.**
  See `specs/README.md` v0.4.0+. Stacked floors tilted in an
  "isometric" style for a model-house effect.

- **Animated heatmaps.**
  Continuous temperature rendered as a gradient over the house
  rather than discrete values.

- **Auto-suggestions from HA Areas.**
  When an overlay references HA entities, suggest their Areas as
  candidate floors.

- **Multi-buildings.**
  One card for the main house, another for the garage. Horizontal
  navigation between buildings + vertical navigation between
  floors.

---

## Reference

High-level roadmap: see
[`specs/README.md`](specs/README.md#roadmap).
