---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [rendering-strategy.md, navigation.md, ../features/data-model.md]
---

# Component Tree

Arbre des composants Lit à l'exécution + conventions de nommage des IDs
SVG. Spec figée pour la v0.1.0.

## Contexte

La card est composée de plusieurs custom elements Lit imbriqués. Cette
décomposition permet la reactive update granulaire (cf.
[`rendering-strategy.md`](rendering-strategy.md)) et la séparation des
responsabilités. Les conventions de nommage SVG existent pour faciliter
le debug DOM (DevTools) et les overrides via card-mod.

## Objectifs

1. Arbre prévisible : un développeur qui ouvre l'inspecteur DOM doit
   comprendre la hiérarchie en 30 secondes
2. Préfixes uniformes pour éviter collisions et faciliter sélecteurs
3. Granularité de reactive update : seul l'élément concerné re-render
   quand son entité change

## Scope

### In

- Hiérarchie des composants Lit
- Conventions de nommage des IDs SVG
- Préfixe `fn-` partout

### Out

- Stratégie de rendu (voir [`rendering-strategy.md`](rendering-strategy.md))
- Logique de navigation (voir [`navigation.md`](navigation.md))
- Format de la config YAML (voir
  [`../features/data-model.md`](../features/data-model.md))

## Comportement attendu — Arbre des composants

```
<floor-navigator-card>           # composant racine, gère config + state global
  └── <fn-navigation-controller>  # gère wheel/swipe/transition state
      ├── <fn-floor-stack>        # conteneur des floors empilés
      │   ├── <fn-floor>          # un par floor déclaré
      │   │   ├── <svg>           # background + overlays
      │   │   │   ├── <image>     # background du floor (PNG/JPG/SVG)
      │   │   │   ├── <fn-overlay-layer> (×N)
      │   │   │   │   └── <fn-element-icon> ou <fn-element-text> (×M)
      │   ├── <fn-floor>
      │   └── <fn-floor>
      ├── <fn-floor-indicator>    # label "L0 — Rez-de-chaussée"
      └── <fn-overlay-buttons>    # barre de boutons toggle
```

## Comportement attendu — Conventions de nommage SVG

Préfixe `fn-` (Floor Navigator) pour éviter collisions :

| Pattern | Description |
|---|---|
| `fn-floor-{floor_id}` | Wrapper `<g>` du floor entier |
| `fn-floor-{floor_id}-bg` | `<image>` background |
| `fn-floor-{floor_id}-overlay-{overlay_id}` | Wrapper `<g>` d'un overlay sur ce floor |
| `fn-element-{entity_id_normalized}` | Wrapper d'un élément (`.` → `-` pour les IDs) |

Exemple de DOM rendu :

```html
<g id="fn-floor-L0">
  <image id="fn-floor-L0-bg" href="L0.png" />
  <g id="fn-floor-L0-overlay-lights">
    <g id="fn-element-light-salon" data-entity="light.salon" data-state="on">
      <circle cx="600" cy="450" r="24" />
      <path d="..." />  <!-- icône MDI lightbulb -->
    </g>
  </g>
</g>
```

Les attributs `data-entity` et `data-state` sont systématiquement présents
sur les wrappers d'éléments, pour faciliter les sélecteurs CSS et le
debug DOM.

## Cas limites

### Floors vides

Un floor déclaré sans aucun élément d'overlay reste rendu (l'image de
fond + un `<svg>` vide sans `<fn-overlay-layer>`). Cohérent : un plan de
maison peut être informatif visuellement même sans éléments.

### IDs SVG dupliqués

La normalisation `.` → `-` dans `entity_id` peut théoriquement créer des
collisions (`light.salon` et `light-salon` deviennent tous deux
`light-salon`). En pratique, HA n'autorise pas les `-` dans les
entity_id, donc la normalisation est sans collision.

Si un même `entity_id` apparaît dans plusieurs overlays (use case
"même lampe dans deux overlays différents"), les wrappers ont le même
ID. Risque mineur d'ambiguïté au sélecteur, mais aucun bug fonctionnel.
À considérer si ce use case devient courant en v0.2.0.

### Refacto futur

Si un nouveau type d'élément apparaît en v0.2.0+ (`badge`, `zone`),
le pattern `<fn-element-{type}>` continue de scaler.

## Questions ouvertes

Aucune.

## Décisions

Pas d'ADR direct sur ce sujet. Le préfixe `fn-` a été décidé pendant la
session de design initiale (2026-05-01) sans débat structurant.
