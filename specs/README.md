---
status: validated
owner: Johann Blais
last_updated: 2026-05-04
related: []
---

# Specs — lovelace-floor-navigator

Ce dossier contient les specs vivantes du projet. Chaque fichier décrit une
décision figée, une feature, ou une convention transverse. Les specs sont
versionnées avec le code et le statut de chaque fichier reflète l'état réel
de l'implémentation.

> **Note pour Claude Code** : avant toute modification de code, lis le ou les
> fichiers de spec correspondants. Si une incohérence est repérée entre la
> spec et le code, consigne-la dans `open-questions.md` plutôt que de
> trancher seul.

## Vision

Carte Lovelace pour Home Assistant qui transforme des plans 2D de maison en
dashboard interactif. L'utilisateur navigue verticalement entre les niveaux
à la molette ou au swipe, et superpose des couches d'information sur les
plans (lampes contrôlables, températures, présence, infrastructure...).

Différenciateurs vs alternatives existantes (Picture-Elements natif,
Floorplan HACS) : navigation native multi-niveaux + overlays modulaires.

## Index des specs

### Architecture (transverse)

| Fichier | Sujet | Statut |
|---|---|---|
| [`architecture/identity.md`](architecture/identity.md) | Nomenclature, custom element tag, licence | implemented |
| [`architecture/component-tree.md`](architecture/component-tree.md) | Arbre Lit, conventions IDs SVG | implemented |
| [`architecture/rendering-strategy.md`](architecture/rendering-strategy.md) | Stratégie 3 hybride + reactive updates | implemented |
| [`architecture/navigation.md`](architecture/navigation.md) | Wheel, swipe, edge_behavior | implemented |
| [`architecture/tech-stack.md`](architecture/tech-stack.md) | Dépendances, TS, Rollup, manifest, scripts | implemented |
| [`architecture/dev-workflow.md`](architecture/dev-workflow.md) | Mode dev rapide + Samba + cycle release | implemented |
| [`architecture/conventions.md`](architecture/conventions.md) | Code style + SemVer | implemented |

### Features

| Fichier | Sujet | Statut |
|---|---|---|
| [`features/data-model.md`](features/data-model.md) | Schéma YAML, champs, tap_actions | implemented |
| [`features/color-scheme.md`](features/color-scheme.md) | Couleurs CSS variables, override | implemented |
| [`features/overlays-toggle.md`](features/overlays-toggle.md) | État local visibleOverlays | implemented |
| [`features/dark-mode.md`](features/dark-mode.md) | Backgrounds light/dark + crossfade | implemented |

### Transverses (vivants)

| Fichier | Rôle |
|---|---|
| [`open-questions.md`](open-questions.md) | Inbox des incohérences vues par Claude Code |
| [`decisions.md`](decisions.md) | ADRs chronologiques |
| [`glossary.md`](glossary.md) | Termes du domaine (floor, overlay, viewBox...) |

## Roadmap

### v0.1.0 — Livrée (2026-05-03)

Card Lovelace fonctionnelle, multi-niveaux, navigation wheel + swipe,
overlays icon + text, tap_actions HA standards. Bundle 47 KB sous la
cible 50 KB. Release GitHub avec asset téléchargeable. Pas encore
publiée sur HACS.

Voir [`decisions.md`](decisions.md) pour les ADRs de la v0.1.0.

### v0.1.1 — Livrée (2026-05-04)

Dark mode pour les images de fond. Champ `backgrounds: { default, dark }`
au niveau floor + setting global `dark_mode` (`auto`/`on`/`off`).
Cascade de détection `setting > hass.themes.darkMode > prefers-color-scheme`,
crossfade 200ms sur opacity, fallback gracieux + warning console pour
les floors sans dark variant. Compat backward complète avec `background`
court de v0.1.0. Voir [`features/dark-mode.md`](features/dark-mode.md)
(statut `implemented`) et l'ADR-005 dans [`decisions.md`](decisions.md).
Bundle 49.7 KiB.

### v0.2.0 — Confort utilisateur (date non fixée)

Tooltip au survol, type `badge`, binding overlays à entités HA,
persistance état overlays (localStorage), animations CSS optionnelles,
raccourcis clavier. Voir aussi [`BACKLOG.md`](../BACKLOG.md) à la racine
pour les irritants identifiés en cours d'usage.

### v0.3.0 — Maturité & publication HACS

Type `zone` (formes SVG colorables), éditeur visuel Lovelace UI,
mode loop optionnel, tests Vitest, i18n, **soumission HACS officielle**.

### v0.4.0+ — Avancé

Auto-détection des Areas HA, heatmaps animées, mode 3D perspective,
support multi-bâtiments.

### Hors scope durable

- WYSIWYG drag-and-drop des éléments → c'est un éditeur de config, pas
  le rôle d'une card
- Pack d'icônes meublées prédéfinies → trop dépendant des préférences

## Workflow specs

1. Toute modification de spec passe par ce dossier (pas de markdown
   en chat à copier-coller)
2. Lire avant d'écrire : `README.md` (cet index) + `open-questions.md`
   + le ou les fichiers de spec concernés
3. Demander avant d'écraser : montrer un résumé du changement, attendre
   le OK explicite avant le commit
4. Une spec = un fichier (pas de mégadocument)
5. Frontmatter YAML obligatoire sur chaque fichier
6. Sections de spec : Contexte / Objectifs / Scope (in & out) /
   Comportement attendu / Cas limites / Questions ouvertes / Décisions

## Format de commit specs

```
specs(<slug>): <verbe> — <description courte>
```

Exemples :
- `specs(dark-mode): add — initial draft of dark mode handling`
- `specs(data-model): update — clarify backgrounds field per Q-2026-05-04`
- `specs: resolve Q-2026-05-04 (backgrounds priority)`

Commit sur la branche par défaut directement (sauf si plusieurs
contributeurs actifs ou demande explicite de PR).

## Ressources externes

- Documentation Lit : https://lit.dev
- Custom Cards in HA : https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- HACS publishing guide : https://hacs.xyz/docs/publish/start
- custom-card-helpers : https://github.com/custom-cards/custom-card-helpers
- Card de référence (Mushroom) : https://github.com/piitaya/lovelace-mushroom
- Workflow `HA_LOCAL_DIR` (custom-sonos-card) : https://github.com/punxaphil/custom-sonos-card
- Workflow `TARGET_DIRECTORY` (streamline-card) : https://github.com/brunosabot/streamline-card
