---
status: validated
owner: Johann Blais
last_updated: 2026-05-04
related: []
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

## Template for future decisions

Copy-paste at the top of the list, just under the main separator.
Number `ADR-NNN` continuing the sequence (the latest one is
`ADR-005`).
