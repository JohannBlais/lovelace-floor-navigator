---
status: validated
owner: Johann Blais
last_updated: 2026-05-06
related: []
---

# Open Questions — Claude Code Inbox

This file is the feedback channel for inconsistencies or ambiguities
spotted by Claude Code during implementation. **Do NOT edit specs
directly from Claude Code** when a doubt arises: log the question
here and wait for resolution.

## Format

Each entry follows this format:

```markdown
## [YYYY-MM-DD] <spec-slug> — <short summary>
- Context: what I was doing when the doubt appeared
- Question: the precise question to settle
- Spec(s) affected: features/X.md, architecture/Y.md
- Status: open | resolved (commit-hash)
```

## Resolution workflow

1. Claude Code writes at the bottom of this file
2. Johann reads the entry and discusses it (typically with Claude
   Opus in the project)
3. The affected spec(s) are updated
4. The entry moves to `Status: resolved` with the hash of the commit
   that applied the resolution
5. If the resolution is structuring, a line is added to
   [`decisions.md`](decisions.md)

## Resolved entries

None for now — initial file. Resolved entries are kept here (not
archived) for institutional memory.

## Open entries

## [2026-05-06] pan-zoom-interactions — Vitest on the gesture state machine: now or v0.3.0?
- Context: starting v0.2.0 spec 2 (pan-zoom-interactions). The brief
  explicitly invites introducing Vitest unit tests on the gesture state
  machine if the surface is risky enough. Surface includes: state
  machine (IDLE / TAP_TRACKING / SWIPE / PAN / PINCH transitions),
  zoom-anchor math, pan clamping at the 50% in-view boundary, double-
  tap timing window, scale<1 clamp inversion.
- Question: introduce Vitest now (devDep + config + CI step) or stay on
  the v0.3.0 plan and ship spec 2 with manual dev-mode + HA testing only?
- Recommendation: defer to v0.3.0 as planned. Risk is real but
  manageable on this scope: (a) the math helpers in `src/utils/transform.ts`
  are pure functions, fully testable when Vitest lands without refactor;
  (b) the state-machine surface mixes DOM events + state which is
  harder to test in isolation without significant setup; (c) introducing
  a test framework mid-spec inflates scope and delays ship. Manual on
  Pixel 9 Pro XL + Fatboy desktop will catch the big-picture regressions.
- Spec(s) affected: `specs/architecture/tech-stack.md` (Vitest reference),
  v0.3.0 roadmap entry in `specs/README.md`
- Status: open — Johann to confirm "defer to v0.3.0" or "go ahead now"

## Resolved entries (cont'd)

## [2026-05-06] pan-zoom-interactions — Pan clamp inversion when scale < 1
- Context: spec line 397 ("zoom_min < 1") flags "the constraint flips —
  the plan stays at least 50% inside the viewport rather than 50%
  inside the plan. To finalise at implementation."
- Resolution: implemented as a two-branch `clampPan` in
  [`src/utils/transform.ts`](../../src/utils/transform.ts):
  - `scale > 1`: scaled plan must keep ≥ 50% of its own area inside
    the card viewport (existing spec)
  - `scale < 1`: the smaller plan must stay at least 50% inside the
    viewport (its centre cannot leave a centred sub-region equal to
    `viewport − plan/2`)
  - `scale === 1`: pan forced to identity
  Same intent in both branches: prevent the user from dragging the
  plan into the void. To revisit if user feedback on `zoom_min < 1`
  configurations shows the formula is too tight or too loose.
- Spec(s) affected: `specs/features/pan-zoom-interactions.md`
- Status: resolved (spec 2 commit on main)

## [2026-05-06] overlay-readability — CI bundle threshold busted by spec 1 alone
- Context: implementing v0.2.0 spec 1 (overlay-readability). Bundle measured
  after type-check + production build = **54.85 KiB (56169 bytes)** vs the
  v0.1.1 baseline of 49.7 KiB. The CI gate in
  `.github/workflows/build.yml` hard-failed at > 51200 bytes (50 KiB).
- Question: ADR-006 anticipated the threshold bump (~60 KiB) and the
  user's brief said to defer it to a follow-up ADR-007 *after spec 2*,
  on the assumption that spec 2 would be the dominant contributor. But
  spec 1 alone overshot the existing threshold by ~5 KiB.
- Resolution (Johann, 2026-05-06): **option 3** — silent bump of the
  CI threshold to a temporary value (58 KiB / 59392 bytes) inside the
  spec 1 commit, with an inline comment in `build.yml` referencing
  ADR-006 and noting that ADR-007 will be opened at end of v0.2.0
  once spec 2 is measured and claw-back (custom-card-helpers
  vendoring) is decided. No formal ADR for now.
- Spec(s) affected: `.github/workflows/build.yml`
- Status: resolved (spec 1 commit `de1f086` on main; the formal
  threshold and ADR-007 follow with the spec 2 commit at 78 KiB)
