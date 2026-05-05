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

When an item is **promoted to a spec** (not yet shipped), remove it
from this file — the spec's frontmatter and the relevant ADR in
[`specs/decisions.md`](specs/decisions.md) become the canonical
record.

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

- **"Edit positions" lightweight authoring mode.**
  Authoring overlays today requires guessing `(x, y)` coordinates
  by trial and error, then refining via `Ctrl+Shift+R` cycles or
  with an external image viewer (Photopea, GIMP) to read pixel
  coordinates manually. Painful at scale (one user reported ~22
  elements in a fresh dashboard).
  Candidate: a card-level toggle (e.g. `settings.edit_mode: true`)
  that overlays a coordinate grid on the active floor and displays
  the cursor's `(x, y)` in viewBox units in a corner pill. Click on
  the plan to copy the coordinates to clipboard. Lightweight,
  read-only — no DOM mutation, no YAML rewrite. Aim is to make the
  manual positioning workflow ~3× faster, not to replace it.
  This entry is a v0.2.x stepping-stone toward the full visual
  editor planned for v0.3.x (see
  [`specs/README.md`](specs/README.md) v0.3.0:
  `getConfigElement` + `getStubConfig` for HACS submission). The
  v0.2.x version validates the placement UX before committing to
  full editor architecture.

- **Overlay groups with mutual exclusion.**
  Some overlay pairs are visually redundant or conflicting when
  shown together. Typical case: `temperature` and `humidity` for
  the same rooms — their text labels share the same coordinates and
  overlap into unreadable mush when both are active. Currently the
  user has to remember to toggle one off before toggling the other
  on, which doesn't scale beyond two or three overlay pairs.
  Candidate: an optional `group` field on the overlay declaration,
  with an opt-in `mutually_exclusive` semantic at the group level.
  Activating one overlay in the group automatically deactivates
  the others in the same group. Sketch:
  ```yaml
  overlay_groups:
    - id: env-readings
      mutually_exclusive: true
  overlays:
    - id: temperature
      group: env-readings
      ...
    - id: humidity
      group: env-readings
      ...
  ```
  Backward-compatible: overlays without `group` keep current
  independent toggle behaviour. Could also be modelled as a simple
  per-overlay `radio_group: <name>` shorthand without a top-level
  `overlay_groups` declaration — to be settled in a small design
  spec when implementing.

- **Elements without an entity (decorative / navigation).**
  The `entity` field is currently mandatory on every element. This
  works for control overlays (lights, plugs) and sensor overlays
  (presence, temperature) where each element ties to an HA entity,
  but breaks down for a third use case discovered in dogfooding:
  **navigation overlays** that act as a visual map of a network /
  infrastructure. Typical case: an `infra` overlay with icons for
  Freebox, switch, NAS, AP, that tap to open admin URLs (Freebox
  portal, Synology DSM, Omada controller, etc.). These devices
  have no HA entity — yet they belong on the floor map.
  Workaround used today: pick an unrelated "always-on" placeholder
  entity (e.g. a Proxmox status binary_sensor) so the icon renders
  with a stable color. Works but lies semantically and forces all
  decorative pastilles to inherit the placeholder's color, which
  also prevents using `tap_action` types like `more-info`
  meaningfully (would open a modal for the wrong entity).
  Candidate: make `entity` optional on elements. When absent:
  - Pastille uses a neutral color (`--fn-color-decorative`,
    new CSS variable) instead of resolving from a state
  - `more-info` tap_action is rejected at config validation time
    (since there's no entity to display)
  - `toggle` and `call-service` likewise rejected without entity
  - `url` and `navigate` tap_actions remain valid (the typical
    use case for this category)
  Backward-compatible: elements with `entity` keep current
  behaviour unchanged. Naturally pairs with the **"navigation
  overlays"** category emerging from real usage — may justify a
  documented overlay typology in the data model (control / sensor
  / navigation) when implementing.

---

## ⚡ Performance / bundle

- **Vendor the `custom-card-helpers` helpers we actually use.**
  We currently import `handleAction`, which pulls in
  `toggle-entity`, `fire-event`, `navigate`, `forwardHaptic`, and
  leaks `@formatjs/intl-utils` via the barrel exports. Total ≈ 3–4
  KB minified for ~150 lines of real logic. Reimplementing the 5–6
  helpers locally would save ~3 KB and remove the Rollup warning
  `"this" has been rewritten to "undefined"` from `@formatjs`.
  Becomes more attractive in v0.2.0, where ADR-006 anticipates
  +6 to +10 KiB of bundle growth and a threshold raise to ~60 KiB.

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
