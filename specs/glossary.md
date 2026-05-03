---
status: validated
owner: Johann Blais
last_updated: 2026-05-03
related: []
---

# Glossary

Termes du domaine utilisés dans le projet et ses specs. Ne contient pas
les termes techniques généraux (Lit, TypeScript, Rollup, etc.) ni les
termes Home Assistant standards (entity_id, hass, service) qui sont
définis ailleurs.

## Concepts cœur

### Floor

Un niveau de la maison. Représenté par une image de fond (PNG, JPG ou
SVG) et un identifiant logique (`L0`, `L1`, `L-1`, etc.). Les floors
sont déclarés en liste ordonnée du HAUT vers le BAS dans la maison
réelle. Exemple : `[L2, L1, L0, L-1]` pour une maison à 4 niveaux dont
le bureau, l'étage 1, le rez-de-chaussée et la cave.

L'ordre est important : le scroll vers le bas avance dans la liste
(scroll-aligned).

### Overlay

Une couche d'information transverse aux floors. Contient des éléments
positionnés sur les plans qui partagent une thématique (lampes,
températures, présence, infrastructure). Un même overlay peut avoir des
éléments sur plusieurs floors.

Les overlays sont **toggleables** indépendamment via la barre de boutons
en bas de la card.

### Element

Un point d'information unique dans un overlay. Lié à une entité Home
Assistant, positionné en coordonnées viewBox sur un floor donné, avec un
type (`icon` ou `text` en v0.1.0) et optionnellement une `tap_action`.

### viewBox

Système de coordonnées global de la card, format SVG standard
(`"x_min y_min width height"`). Toutes les positions des éléments sont
exprimées dans ce système. Choix typique pour des plans de maison :
`"0 0 1920 1080"`.

Le système viewBox isole les positions des plans des dimensions réelles
de la card à l'affichage : la card peut être resize, le viewBox reste
constant et les positions des éléments restent cohérentes.

## Concepts de navigation

### Transition

Animation entre deux floors lors d'un changement. Trois variantes
disponibles en v0.1.0 :

- `crossfade` (défaut) : fondu entre les deux floors
- `slide` : translation verticale, le nouveau floor pousse l'ancien
- `slide-scale` : translation + zoom subtil

### Edge behavior

Comportement quand l'utilisateur tente de naviguer au-delà du dernier ou
du premier floor.

- `bounce` (défaut) : animation de rebond, pas de changement de floor
- `none` : rien ne se passe
- `loop` : retour au floor opposé (L0 ↔ Ln)

### Scroll-aligned

Convention de direction de navigation : scroll/swipe vers le BAS = floor
SUIVANT dans la liste de configuration. Cohérent avec un comportement
"scroll de page" classique : on descend pour aller vers le bas de la
maison.

## Concepts visuels

### Pastille

Cercle coloré qui rend une icône d'élément (type `icon`). La couleur
encode l'état de l'entité (allumé/éteint, occupé/vide, etc.) via les
CSS variables du composant.

### Halo

Liseré clair autour de la pastille (généralement blanc translucide) qui
améliore la lisibilité des icônes sur des fonds variés. Pattern Material
Design.

### Indicator

Petite pastille flottante en bas-droite qui affiche le `name` du floor
courant. Visible par défaut, désactivable via
`settings.show_floor_indicator: false`.

### Overlay buttons (barre)

Barre de boutons toggleant la visibilité de chaque overlay. Position
configurable (`top`, `bottom`, `none`) via
`settings.overlay_buttons_position`.

## Conventions de nommage

### Préfixe `fn-`

Tous les custom elements et IDs SVG du composant utilisent le préfixe
`fn-` (Floor Navigator). Évite les collisions avec d'autres composants
Lovelace qui pourraient cohabiter sur le même dashboard.

Exemples : `<fn-floor>`, `<fn-element-icon>`,
`id="fn-floor-L0-bg-default"`, `--fn-color-on`.

### CSS variables `--fn-*`

Toutes les CSS variables exposées par le composant pour customisation
utilisent le préfixe `--fn-`. Documentées dans
[`features/color-scheme.md`](features/color-scheme.md).

## Termes spécifiques au projet

### Pattern HACS

Conventions partagées par les custom cards de l'écosystème HACS, sans
être obligatoires. Couvrent : suffixe `-card` pour les custom elements,
exposition `console.info` au chargement avec version, registration via
`window.customCards.push()`, manifest `hacs.json`. Voir
[`architecture/identity.md`](architecture/identity.md).

### Mode "dev rapide"

Workflow de développement local qui ouvre `dev/index.html` dans le
navigateur avec un mock du `hass` object, sans dépendance à HA réel.
Permet d'itérer en quelques secondes sur le visuel et la logique. Voir
[`architecture/dev-workflow.md`](architecture/dev-workflow.md).

### Mode "test intégration"

Workflow utilisant la convention `HA_LOCAL_DIR` pour faire écrire le
bundle Rollup directement dans le dossier `www/` de HAOS via partage
Samba. Permet de tester sur le vrai HA avec les vraies entités. Voir
[`architecture/dev-workflow.md`](architecture/dev-workflow.md).
