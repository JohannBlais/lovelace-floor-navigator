---
status: validated
owner: Johann Blais
last_updated: 2026-05-04
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

_No open entries at the moment._

## Resolved entries (cont'd)

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
- Status: resolved (spec 1 commit on main)
