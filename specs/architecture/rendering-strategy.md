---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [component-tree.md, navigation.md]
---

# Rendering Strategy

Stratégie de rendu DOM/CSS et mécanique de reactive updates Lit. Spec
figée pour la v0.1.0.

## Contexte

Une card multi-floors avec navigation fluide pose deux questions
techniques :

1. **Comment empiler N floors et basculer entre eux** sans flash visible,
   en gardant les transitions performantes ?
2. **Comment re-render uniquement les éléments dont l'entité a changé**,
   sans re-render toute la card à chaque update HA ?

Les choix faits ici déterminent les perfs perçues et la simplicité du
code. Trois stratégies de rendu ont été considérées avant de retenir
l'option hybride.

## Objectifs

1. Transitions fluides 60fps même sur mobile mid-range
2. Re-render granulaire : seul l'élément concerné re-render quand son
   entité change
3. Code prévisible : pas de magie, le développeur peut suivre le flux
4. Pas de fuite mémoire : les listeners et watchers sont cleanés en
   `disconnectedCallback`

## Scope

### In

- Stratégie d'empilement DOM des floors
- Mécanique de reactive update Lit
- Stratégie d'animation CSS pour les transitions

### Out

- Logique de détection wheel/swipe (voir
  [`navigation.md`](navigation.md))
- Détail des composants (voir
  [`component-tree.md`](component-tree.md))

## Comportement attendu — Stratégie 3 (hybride)

Les trois stratégies considérées :

1. **Mount/unmount à chaque change** : seul le floor courant est dans
   le DOM, on remplace au change → simple mais flash + re-fetch image à
   chaque navigation
2. **Tous les floors dans le DOM, un seul visible** : tous rendus, le
   non-courant en `display: none` → pas de flash mais transitions
   impossibles (pas de transition CSS sur display)
3. **Hybride (retenue)** : tous les floors dans le DOM, empilés via
   CSS `position: absolute` à la même origine, avec `transform` et
   `opacity` pour les transitions

### Mécanique CSS

- Tous les `<fn-floor>` sont en `position: absolute` à `top: 0; left: 0`
- Trois classes pilotent l'état :
  - `fn-floor-active` : floor courant, visible
  - `fn-floor-prev` : floor au-dessus dans la liste, hors-vue en haut
  - `fn-floor-next` : floor en-dessous dans la liste, hors-vue en bas
- Les transitions sont des animations CSS sur `transform` et `opacity`
  selon le mode choisi (`crossfade`, `slide`, `slide-scale`)

### Choix de transition

Le mode est piloté par `settings.transition` (défaut `crossfade`). Le
`fn-navigation-controller` applique les classes appropriées selon le
mode et la direction (up/down). Les keyframes sont définis dans le CSS
de `card-styles.ts`.

## Comportement attendu — Reactive updates

Approche retenue : **reactive properties par element**.

- `<fn-element-icon>` et `<fn-element-text>` sont des LitElements avec
  `@property() hass: HomeAssistant`
- Lit re-render uniquement les elements dont l'entité a changé entre
  deux updates de `hass`
- Pattern standard HA, identique à Mushroom et Mini-Graph

### Mécanique

Le composant racine `floor-navigator-card` reçoit `hass` via setter HA,
le passe à `<fn-navigation-controller>` qui le diffuse aux
`<fn-floor>` puis aux `<fn-overlay-layer>` puis aux éléments. À chaque
update :

1. Lit compare `hass` ancien vs nouveau
2. Pour chaque élément, le `shouldUpdate` natif de Lit ne déclenche le
   re-render que si l'entité de cet élément a effectivement changé
3. Le DOM SVG du seul élément concerné est patché

### Coût

Pour ~50 éléments actifs simultanément (ordre de grandeur d'une maison
configurée à fond), aucun jank perceptible mesuré au profilage. Pour
des configs très larges (~200+ éléments), une optimisation per-element
serait envisageable (fork du `<fn-element-text>` actuel qui dépend du
re-render parent), voir BACKLOG.md.

## Cas limites

### Premier render

Au tout premier render, aucun floor n'a encore la classe `fn-floor-active`.
Le `fn-navigation-controller` initialise l'état au montage avec :
- `currentFloorIndex` = index du floor déclaré dans `settings.start_floor`
  (ou 0 si non spécifié)
- Application immédiate des classes sans animation (transition CSS
  désactivée temporairement via une classe `fn-no-transition`, retirée
  après le premier paint)

### Floor unique

Si `floors` ne contient qu'un seul floor, la navigation est désactivée
au niveau du controller (early return dans le handler wheel/touch).
L'indicateur de floor reste affiché si `show_floor_indicator: true`.

### Plus de 5 floors

Le DOM contient tous les floors, donc 10+ floors = 10+ images en
mémoire. Pour des plans 100-500 KB chacun, ça reste sous le MB. Pas de
limite dure imposée.

### Resize de la card

Le système viewBox SVG isole les positions des dimensions réelles
d'affichage. La card peut être resize sans casser les positions des
éléments. Le browser scale automatiquement le contenu SVG.

## Questions ouvertes

Aucune.

## Décisions

Stratégie 3 retenue lors de la session de design initiale (2026-05-01)
sans ADR formel — les autres options étaient inférieures sur tous les
critères pertinents.
