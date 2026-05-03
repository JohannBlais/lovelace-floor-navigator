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
