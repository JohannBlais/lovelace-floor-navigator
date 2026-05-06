---
status: validated
owner: Johann Blais
last_updated: 2026-05-06
related: [features/pan-zoom-interactions.md, features/overlay-readability.md]
---

# Decisions — chronological ADRs

This file records the project's structuring decisions as dated ADRs
(Architecture Decision Records). Each entry captures the context, the
chosen option, and the rejected alternatives.

Purely editorial decisions (renaming a variable, moving a file) do not
belong here. Technical decisions with lasting impact (stack choice,
API naming, conventions) are recorded.

## Format

```markdown
## [YYYY-MM-DD] ADR-NNN — Short title

**Context**: why the question came up.

**Decision**: what was chosen.

**Rejected alternatives**: what was considered and rejected, with
reasons.

**Consequences**: practical impacts, possible debt, points of vigilance.

**Status**: accepted | superseded by ADR-MMM | deprecated
```

---

## [2026-05-01] ADR-001 — Custom element tag suffixed with `-card`

**Context**: at bootstrap, first attempt with
`type: custom:floor-navigator` in the YAML. HA returned the error
"Custom element doesn't exist". HA resolves `custom:<X>` by looking
for a custom element named exactly `<X>`. Our tag being
`floor-navigator-card`, the YAML had to match.

**Decision**: custom element tag = `floor-navigator-card`, YAML type
= `custom:floor-navigator-card`. Standard HACS convention
(`mushroom-light-card`, `mini-graph-card`, `button-card`,
`bubble-card`).

**Rejected alternatives**:
- `floor-navigator` short and `custom:floor-navigator` type → broken,
  not compliant with the HACS convention

**Consequences**: every YAML example must reference
`custom:floor-navigator-card`. Spec
[`architecture/identity.md`](architecture/identity.md) records this
name as the frozen identity of the component.

**Status**: accepted

---

## [2026-05-01] ADR-002 — Explicit `.env.local` loading on the Rollup side

**Context**: the Rollup config used `import 'dotenv/config'`, which
did not load variables from `.env.local` despite expectations.
Investigation: the `.env.local` overriding `.env` convention is
specific to Vite/Next.js, not vanilla dotenv. The shortcut loads
`.env` by default, full stop.

**Decision**: use `dotenv.config({ path: '.env.local' })` explicitly
at the top of `rollup.config.js`.

**Rejected alternatives**:
- Keep `import 'dotenv/config'` and create a `.env` instead of
  `.env.local` → less clean because `.env` is conventionally
  committed to the repo for public values, while `.env.local` is
  gitignored for local values

**Consequences**: pattern documented in
[`architecture/tech-stack.md`](architecture/tech-stack.md) §Rollup
config.

**Status**: accepted

---

## [2026-05-03] ADR-003 — Definition of "done" for v0.1.0

**Context**: before tagging v0.1.0, we needed objective release
criteria to avoid shipping prematurely. Criteria derived from the
spec scope and practical constraints (mobile, bundle perf).

**Decision**: v0.1.0 ships when ALL of these are true:
- All v0.1.0 features listed on the roadmap are implemented
- The card works on Johann's real HA against his 3 plans (L0, L1, L2)
- At least 5 light entities, 5 temperature sensors, and 2–3 presence
  binary_sensors are mapped
- Manual test on Pixel 9 Pro XL: smooth swipe navigation, taps
  working
- Manual test on the Fatboy desktop: smooth wheel navigation
- README understandable to a non-Johann
- Final JS bundle < 50 KB (gzipped < 20 KB)
- No error in the HA console at card load

**Rejected alternatives**:
- Test only in local dev mode → insufficient, certain HA load bugs
  only show up in real integration
- A more permissive bundle target → bloat risk is high on Lovelace
  custom cards; setting 50 KB early enforces discipline

**Consequences**: criteria met on 2026-05-03, v0.1.0 tag published
with a final 47 KB bundle.

**Status**: accepted (historical, for record)

---

## [2026-05-03] ADR-004 — Bootstrap of the `/specs/` structure

**Context**: the initial spec lived in a single megadocument
`docs/SPEC.md` of ~1100 lines mixing identity, data model,
architecture, stack, workflow, roadmap, Claude Code steps. With
v0.1.1 (dark mode) and beyond, the format does not scale: no per-
feature status granularity, no Claude Code feedback channel, the
megadocument has to be reloaded entirely on every edit.

**Decision**: adopt the `/specs/` structure mandated by the project
rules (at the repo root, not under `docs/`). Transverse files
(README, open-questions, decisions, glossary, conventions) +
`architecture/` and `features/` subfolders. YAML frontmatter
mandatory on every file. One spec = one file.

**Rejected alternatives**:
- Keep `docs/SPEC.md` and extend it with a richer changelog → does
  not solve the granularity problem nor the Claude Code feedback
- Place `/specs/` under `docs/specs/` → contrary to the project
  convention

**Consequences**:
- `docs/SPEC.md` removed after full content migration
- `BACKLOG.md` at the repo root remains valid (living irritants, not
  spec)
- Every future feature addition goes through
  `specs/features/<slug>.md`

**Status**: accepted

---

## [2026-05-04] ADR-005 — Dark mode for floor backgrounds (v0.1.1)

**Context**: v0.1.0 displays a single image per floor. When the user
enables HA dark mode (manually or via time-based auto-detection), the
rest of Lovelace switches dark, but the card stays on the light plan
— visual inconsistency that strains the eyes in the evening. Need
for an optional dark-variant mechanism, isolated from the rest of the
card (touches neither navigation nor overlay element colours).

**Decision**: isolated v0.1.1 implementation with full backward
compatibility, detailed in
[`features/dark-mode.md`](features/dark-mode.md). Seven structuring
choices:

- **Granularity**: global `dark_mode` setting (`auto`/`on`/`off`) +
  optional `backgrounds` field per floor. Visual consistency driven
  globally, image declaration locally.
- **Naming `backgrounds.{default, dark}`** extended, with an open
  index signature (`[key: string]: string`) for future modes
  (high-contrast, sepia, ambient...) without breaking change.
  `default` rather than `light` because it is the universal
  fallback, not just the light-mode image.
- **Backward compatibility short `background` + extended
  `backgrounds`**: both forms coexist. If both are set on the same
  floor, `backgrounds` wins and `background` is silently ignored.
- **Detection cascade**: `setting` (on/off highest priority) >
  `hass.themes.darkMode` > `prefers-color-scheme: dark` (browser
  fallback).
- **Simple ~200ms crossfade** on opacity, distinct from the
  navigation transition system. The light/dark toggle is an
  appearance change, not a spatial movement.
- **Silent fallback + console warning** once per floor missing a
  dark variant. No "all or nothing" that would disable global dark
  mode if a single floor is missing.
- **v0.1.1 patch release** rather than grouping into v0.2.0:
  technically isolated feature + full backward compatibility justify
  the SemVer patch bump (cf.
  [`architecture/conventions.md`](architecture/conventions.md)).

**Rejected alternatives**:
- Auto-generation of a dark image via CSS `filter: invert(1)` → less
  readable than a dedicated image, poor result on coloured photos
- Boolean `dark_mode: true/false` setting → does not cover the "auto
  based on HA" case, the 3-value enum is more expressive
- Single polymorphic `background` field (string or object) →
  ambiguity in YAML, the 2-field explicit form is clearer
- Switching element colours in dark mode → deferred, out of scope
  for v0.1.1 (existing CSS variables stay identical between light
  and dark; a dark HA theme can override them)

**Consequences**:
- The 4 post-impl files updated: status of `dark-mode.md` →
  `implemented`, fields merged into `data-model.md`, ADR-005 here,
  changelog item in `specs/README.md` v0.1.1
- Bundle from 47.0 → 49.7 KiB (50877 bytes), 323-byte margin under
  the build CI 50 KiB threshold. Tight; the BACKLOG mentions
  vendoring `custom-card-helpers` (~3 KiB gain) if more headroom is
  needed in v0.2+
- `Backgrounds[key: string]` index signature opens the YAML contract
  for future modes without breaking change
- Floors documented in short form (v0.1.0) will continue to work
  indefinitely (backward compat through v1.0)
- The class toggle `fn-theme-{light|dark}` is placed on the `<svg>`
  of each `<fn-floor>` (and not on the card root) to stay within the
  shadow DOM where the `<image>` elements targeted by the
  `backgroundCrossfade` rules live

**Status**: accepted

---

## [2026-05-06] ADR-006 — Mobile UX strategy (v0.2.0)

**Context**: v0.1.x ships with desktop-first UX assumptions. The
card respects the Lovelace grid sizing (no escape to fullscreen),
overlay sizes are hard-coded in viewBox units (illegible on mobile,
broken on unusual viewBoxes — see BACKLOG.md pre-promotion), and
there is no zoom support (the controller blocks it via
`touch-action: none` and a multi-finger guard, see
[`architecture/navigation.md`](architecture/navigation.md) "Pinch-to-
zoom gesture" edge case).

Concrete pain points reported on a Pixel 9 Pro XL:
- Portrait: card occupies the upper third of the screen, overlay
  icons and text shrink to a few screen pixels, illegible
- Landscape: the card is height-clipped by the surrounding row,
  hiding the overlay button bar at the bottom
- No way to zoom into a corner of the plan to inspect a small
  element

A multi-pronged UX overhaul targeting mobile (and benefiting desktop)
was discussed on 2026-05-05/06, with Johann arbitrating four
structuring choices. Three v0.2.0 specs result, mutually supportive
but each independently valuable.

**Decision**: ship three features in v0.2.0:
- [`features/mobile-fullscreen-mode.md`](features/mobile-fullscreen-mode.md)
  — explicit-button fullscreen, CSS-based, multi-exit-path, state
  preservation across enter/exit
- [`features/pan-zoom-interactions.md`](features/pan-zoom-interactions.md)
  — unified transform engine across pinch / Ctrl+wheel / double-tap
  / vertical slider; rewrite `<fn-navigation-controller>` from
  `touchstart/move/end` + `touch-action: none` to PointerEvents
- [`features/overlay-readability.md`](features/overlay-readability.md)
  — screen-space sizing for icons and text, viewBox-relative
  defaults, minimum-size floors, single ResizeObserver shared with
  pan-zoom

The four arbitrations made by Johann:

1. **Fullscreen activation**: explicit button rather than
   auto-on-tap. Avoids false triggers when interacting with overlay
   elements; lets the user keep the embedded view as the default.

2. **Zoom engine unified across desktop and mobile** rather than
   mobile-only pinch. All input sources converge to the same
   `Transform` state. The vertical zoom slider on the side is
   included, always visible on both desktop and mobile, to be
   validated at implementation review (can be removed if the UX
   turns out to be redundant).

3. **Overlay text always visible** with a screen-pixel minimum size,
   rather than hidden behind a zoom threshold or revealed via tap-
   to-detail. Spatial overview at a glance is preferred over
   zoom-to-read.

4. **Tablet treated as desktop** by default. Breakpoint heuristic:
   `(max-width: 768px) and (pointer: coarse)`. iPads and Android
   tablets land in desktop mode, where the embedded view + zoom
   already cover their needs (Ctrl/Cmd+wheel via Magic Keyboard,
   plus pinch on the screen). To validate at usage, adjustable
   without spec change if hybrid devices misbehave.

**Rejected alternatives**:

- **Auto-fullscreen on mobile load**: surprising default, breaks the
  Lovelace convention of cards staying in the grid. Rejected at
  arbitration #1.
- **Mobile-only pinch (no desktop zoom)**: leaves desktop users with
  detailed plans without inspection capability. Rejected at
  arbitration #2 — Ctrl+wheel and double-tap are the desktop
  primitives.
- **Hidden text below a zoom threshold OR tap-to-reveal popover**:
  optimises for clean visuals over information density, contrary
  to the user's preferred mental model of the dashboard. Rejected
  at arbitration #3.
- **Three separate ADRs (one per feature)**: features share a
  unified motivation (mobile UX) and architectural touchpoints
  (`<fn-navigation-controller>` rewrite, single transform engine,
  shared ResizeObserver). Single ADR captures the strategy;
  per-feature specs hold the details. Same pattern as ADR-005
  (dark mode bundled 7 structuring choices).

**Consequences**:

- `<fn-navigation-controller>` rewritten: `touch-action: none`
  replaced with PointerEvents-based gesture handling. Pinch + pan +
  swipe + wheel coexist within a single state machine. Affected
  spec: [`architecture/navigation.md`](architecture/navigation.md)
  — to update post-implementation (the "Pinch-to-zoom gesture" edge
  case becomes obsolete; the controller's gesture state machine
  needs a fresh description).
- A new `Transform` state (`scale`, `x`, `y`) lives on the card
  root, applied via CSS transform on the `<fn-floor-stack>`
  wrapper. Reset on floor change. Affected spec:
  [`architecture/rendering-strategy.md`](architecture/rendering-strategy.md)
  — to update post-implementation (the transform layer between
  viewBox and screen coordinates is a new concept).
- A single ResizeObserver on the card root drives reactive
  recomputation of `viewBox_to_screen_ratio`. Source of truth
  shared between pan-zoom (for transform conversion) and
  overlay-readability (for screen-space sizing).
- Bundle impact: estimated +6 to +10 KiB before optimisation. The
  current build CI threshold of 50 KiB has only 0.3 KiB margin
  (49.7 KiB at v0.1.1). The threshold needs raising for v0.2.0 —
  propose 60 KiB. Vendoring `custom-card-helpers` (BACKLOG ⚡
  candidate, ~3 KiB gain) becomes more attractive. Threshold
  decision deferred to a follow-up entry once v0.2.0 bundle is
  measured.
- Two BACKLOG entries promoted to specs and removed from
  `BACKLOG.md`:
  - 🔮 "Pinch-zoom on the plan" → `pan-zoom-interactions.md`
  - 🐛 "Default sizes for icons / text are hard-coded" →
    `overlay-readability.md`
- Backward compatibility:
  - Fullscreen: pure addition (opt-in via explicit button)
  - Pan-zoom: pure addition (default state is identity transform,
    no visible change)
  - Overlay readability: backward-compatible config; the implicit
    default for `overlay_size_unit` stays `viewbox` for v0.1.x
    configs (no behaviour change on upgrade). New v0.2.0 configs
    use `px` per the recommended baseline. Migration documented.
- v0.2.0 SemVer minor bump (additive features, no breaking
  changes).

**Recommended implementation order** (independent, but with one
dependency):

1. **`overlay-readability.md` first**: independent, smallest risk,
   improves the experience even before the other two ship. Resolves
   the BACKLOG hard-coded sizes bug. Establishes the
   `viewBox_to_screen_ratio` ResizeObserver that pan-zoom will
   reuse.
2. **`pan-zoom-interactions.md`**: depends on the controller
   rewrite, the largest-surface change. Reuses the
   `viewBox_to_screen_ratio` from step 1. Once shipped, overlay
   sizes in px mode also compensate against zoom (they are no-op
   compensated at scale 1 from step 1).
3. **`mobile-fullscreen-mode.md`**: depends on (2) for state
   preservation across enter/exit (zoom transform must survive the
   transition). Smallest of the three, ships last to round out the
   v0.2.0 experience.

**Status**: accepted (with the 2026-05-06 follow-up note below on
arbitration #2 — the always-visible vertical zoom slider was
prototyped, then removed at implementation review.)

**Follow-up [2026-05-06] — slider removed at implementation review**:
ADR-006 arbitration #2 hedged the always-visible slider as "to be
validated at implementation review (can be removed if the UX turns
out to be redundant)". After spec 2 ship, the slider was tested side
by side with pinch / Ctrl+wheel / double-tap. Verdict: redundant.
Pinch (mobile) + Ctrl-wheel (desktop) + double-tap (toggle / reset
when zoomed) cover all interaction needs. The slider was permanent
visual clutter without unique function.

The slider was deleted before v0.2.0 ship. Affected files / specs:

- `src/components/fn-zoom-slider.ts` removed
- `zoom_slider` setting + `ZoomSliderPosition` type removed from
  `src/types/config.ts` and the card-root validation
- `pan-zoom-interactions.md` Input source / Slider visual / Edge case
  sections struck; "Always-visible slider" decision marked as
  superseded; an implementation note + this follow-up entry record
  the rationale
- `data-model.md` and `architecture/component-tree.md` cleaned up
- Bundle reclaimed ~3 KiB raw / ~1 KiB gzipped — puts the build back
  under the ADR-003 secondary 20 KiB gzipped target

The "minor mode-specific quirks" worry that justified the slider
(mobile users not aware of pinch) is partially compensated by spec
3's fullscreen button, which gives a discoverable affordance. Pinch
itself is universal across iOS / Android touch.

The slider can always be re-introduced as an opt-in setting
(`zoom_slider: right | left | none`, default `none`) in a future
patch release if user feedback warrants. Not a one-way door.

---

## [2026-05-06] ADR-007 — Bundle threshold raise to 78 KiB (v0.2.0)

**Context**: at v0.1.1 the build CI gate was `< 50 KiB` (51200 bytes,
ADR-003), and the bundle measured 49.7 KiB — 323-byte margin. ADR-006
anticipated a v0.2.0 raise to ~60 KiB based on a `+6 to +10 KiB`
estimate for the three-spec mobile UX overhaul. The threshold was
silently bumped to 58 KiB during spec 1 (overlay-readability,
54.85 KiB measured; resolved entry in `open-questions.md` 2026-05-06)
with the formal ADR deferred until spec 2 ship.

After spec 2 (pan-zoom-interactions) ships, the actual bundle is
**71.3 KiB raw / 19.9 KiB gzipped** — significantly above ADR-006's
prediction. Breakdown of the v0.2.0 series:

- v0.1.1 baseline: 49.7 KiB
- spec 1 overlay-readability: +5.1 KiB → 54.85 KiB
- spec 2 pan-zoom-interactions: +14.4 KiB → 71.3 KiB
- spec 3 mobile-fullscreen-mode (estimated): +3 to +5 KiB → ~74–76 KiB

The variance vs ADR-006's `+6 to +10 KiB` total is driven mostly by
spec 2: the gesture state machine, pinch math, slider component, and
prop threading were heavier than estimated. Manual minification by
Rollup + terser is already on; further claw-back would require
vendoring `custom-card-helpers` (BACKLOG ⚡, ~3 KiB gain) or
hand-trimming Lit helpers (uncertain gains, fragility risk).

**Decision**: raise the build CI threshold to **78 KiB**
(79872 bytes), updated in `.github/workflows/build.yml`. Headroom
breakdown:

- Current spec 2 bundle: 71.3 KiB (8.7 KiB margin under 78)
- Spec 3 buffer: ~5 KiB (CSS-mostly feature)
- Polish / minor regression buffer: ~2 KiB

Network footprint unchanged: 19.9 KiB gzipped is just under the
ADR-003 secondary target of `< 20 KiB gzipped`. Loading speed on
Lovelace dashboards is dominated by the gzipped figure, so the user-
facing performance remains within the original discipline envelope.

**Rejected alternatives**:

- **Stay at 60 KiB and claw back to fit**: requires vendoring
  custom-card-helpers (~3 KiB gain) AND tightening Lit usage. Even
  combined, would not fit spec 2 alone (need ~11 KiB more than
  60 KiB allows). Rejected as infeasible without scope cuts.
- **Raise to 80+ KiB for unconditional headroom**: looser than
  needed, dilutes the discipline. The 78 KiB number leaves
  defendable margin without inviting drift.
- **Drop the gzipped target too**: not needed — we are still under
  the 20 KiB gzipped target. Discipline preserved at the network
  level, where it matters most for HACS-distributed cards.

**Consequences**:

- `.github/workflows/build.yml` updated to enforce 78 KiB.
- ADR-003's "< 50 KB" target is **superseded for v0.2.0+** by this
  ADR. The original rationale (anti-bloat discipline on Lovelace
  cards) still holds; the number simply tracks reality post-pan-zoom.
- `BACKLOG.md` `custom-card-helpers` vendoring entry remains a
  candidate optimization for v0.3.0 (would reclaim ~3 KiB and
  potentially open room for v0.3.0 features within the same 78 KiB
  envelope).
- `specs/architecture/tech-stack.md` "Bundle exceeding 50 KB" edge
  case to be updated to reference this ADR when the next spec edit
  touches that section (deferred to spec 3 commit for atomicity).

**Status**: accepted. Supersedes the implicit 50 KiB target of
ADR-003 for v0.2.0+.

---

## Template for future decisions

Copy-paste at the top of the list, just under the main separator.
Number `ADR-NNN` continuing the sequence (the latest one is
`ADR-007`).
