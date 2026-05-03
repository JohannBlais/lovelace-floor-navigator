---
status: validated
owner: Johann Blais
last_updated: 2026-05-03
related: []
---

# Open Questions — Inbox Claude Code

Ce fichier est le canal de remontée des incohérences ou ambiguïtés repérées
par Claude Code pendant l'implémentation. **Ne PAS éditer directement les
specs depuis Claude Code** quand un doute apparaît : poser la question
ici et attendre la résolution.

## Format

Chaque entrée suit ce format :

```markdown
## [YYYY-MM-DD] <slug-spec> — <résumé court>
- Contexte : ce que je faisais quand le doute est apparu
- Question : la question précise à trancher
- Spec(s) impactée(s) : features/X.md, architecture/Y.md
- Status: open | resolved (commit-hash)
```

## Workflow de résolution

1. Claude Code écrit en bas de ce fichier
2. Johann lit l'entrée et en discute (typiquement avec Claude Opus dans le
   projet)
3. La ou les specs concernées sont mises à jour
4. L'entrée passe en `Status: resolved` avec le hash du commit qui a
   appliqué la résolution
5. Si la résolution est structurante, une ligne est ajoutée à
   [`decisions.md`](decisions.md)

## Entrées résolues

Aucune pour l'instant — fichier initial. Les entrées résolues sont
conservées ici (pas archivées) pour mémoire institutionnelle.

## Entrées ouvertes

_Aucune entrée ouverte pour le moment._
