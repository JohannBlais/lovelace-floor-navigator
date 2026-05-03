---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [rendering-strategy.md, ../features/data-model.md]
---

# Navigation

Détection des intentions utilisateur (wheel desktop, swipe mobile) et
comportement aux extrémités. Spec figée pour la v0.1.0.

## Contexte

La proposition de valeur centrale de la card est la navigation fluide
entre niveaux. Cette navigation doit être :

- **Intuitive** : convention de direction cohérente desktop/mobile
- **Fiable** : pas de saut accidentel, pas de double trigger
- **Réactive** : transitions immédiates au geste, pas de latence
  perçue
- **Discriminée** : un swipe ne doit pas déclencher un tap d'élément, et
  vice versa

## Objectifs

1. Wheel desktop : 1 cran molette = 1 changement de floor, jamais 2
2. Swipe mobile : seuil clair pour distinguer scroll vs swipe intentionnel
3. Convention "scroll-aligned" : down → suivant dans la liste
4. Comportement aux extrémités configurable (bounce / none / loop)
5. Pas d'interférence avec les tap_actions des éléments

## Scope

### In

- Détection wheel + throttle
- Détection swipe touch
- Edge behavior aux extrémités
- Discrimination tap vs swipe

### Out

- Animation des transitions (voir
  [`rendering-strategy.md`](rendering-strategy.md))
- Champs de config (voir
  [`../features/data-model.md`](../features/data-model.md))
- Raccourcis clavier (PageUp/PageDown) → reporté en v0.2.0+

## Comportement attendu — Détection wheel (desktop)

- Listener `wheel` sur le conteneur racine (`<floor-navigator-card>`)
- Throttle pour éviter les sauts multiples : 1 changement de floor par
  400ms minimum
- Direction `deltaY > 0` → floor SUIVANT dans la liste
  (`currentFloorIndex + 1`)
- Direction `deltaY < 0` → floor PRÉCÉDENT (`currentFloorIndex - 1`)

Le throttle est implémenté via une variable de timestamp local
(`_lastNavigationTime`) sans `setTimeout` pour éviter les leaks.

## Comportement attendu — Détection swipe (mobile/touch)

- Listeners `touchstart` / `touchmove` / `touchend` sur le conteneur
  racine
- Tracking du déplacement vertical (`deltaY = touch.clientY -
  startY`) pendant le `touchmove`
- Au `touchend`, déclenchement de la navigation si :
  - `|deltaY| > 50` (px de déplacement minimum)
  - **OU** vélocité `|deltaY| / duration > 0.3` (px/ms)
- Direction down (deltaY > 0) → floor SUIVANT
- Direction up (deltaY < 0) → floor PRÉCÉDENT

Le double critère (déplacement OU vélocité) gère deux cas :
- Geste lent et long : déplacement franchit le seuil
- Geste rapide et court : vélocité franchit le seuil

## Comportement attendu — Edge behavior

`settings.edge_behavior` pilote le comportement quand l'utilisateur
tente de naviguer au-delà du dernier ou du premier floor.

### `bounce` (défaut)

- Animation CSS de "rebond" (~150ms, easing back-out, amplitude 20px)
  appliquée au floor courant
- Aucun changement de floor effectif (`currentFloorIndex` reste constant)
- Indicateur visuel implicite : l'utilisateur comprend qu'il est en butée

### `none`

Rien ne se passe. Pas d'animation, pas de feedback. Pour les setups où
l'animation parasite distrait.

### `loop`

Retour au floor opposé : si on est au dernier floor et qu'on scroll
down, on retourne au premier floor (et inversement). Comportement type
"carrousel infini".

## Comportement attendu — Discrimination tap vs swipe

Le challenge : un tap sur un élément d'overlay déclenche son
`tap_action` (toggle, more-info, etc.), mais un swipe initié sur cet
élément doit déclencher la navigation, pas l'action.

### Mécanique exploitée

Les browsers ne synthétisent **pas** d'événement `click` quand le
`touchend` est éloigné de plus de ~10px du `touchstart`. Donc :

- Tap court sur un élément (déplacement < 10px) → click event natif →
  `<fn-element-icon>` capte → `handleAction` appelé
- Swipe long sur un élément (déplacement > 50px) → pas de click natif
  → `<fn-element-icon>` ne capte rien → seul le controller voit le
  geste et navigue

Le seuil natif du browser (~10px) est plus strict que notre seuil de
swipe (50px), donc la zone "ambiguë" entre 10 et 50px ne déclenche **ni**
tap **ni** swipe (rien ne se passe). Comportement acceptable, voire
souhaitable (filtre les gestes accidentels).

### Garde-fou défensif

`<fn-element-icon>` appelle `e.stopPropagation()` dans son handler de
click pour éviter que le controller capte aussi l'événement et
navigue. Pas strictement nécessaire vu le mécanisme browser ci-dessus,
mais protège contre des comportements futurs (hold_action, etc.).

## Cas limites

### Geste pinch-to-zoom

Un geste à 2 doigts (zoom natif iOS/Android) ne doit pas déclencher la
navigation. Le `touchstart` enregistre `e.touches.length === 1` comme
condition d'engagement du tracking. Si plusieurs doigts sont posés,
le tracking est annulé.

### Tap sur un bouton d'overlay pendant qu'on swipe

Si l'utilisateur commence un swipe avec le doigt sur un bouton de la
barre d'overlay, le browser ne synthétise pas de click → la navigation
se fait, le bouton n'est pas toggle. Comportement actuel = sémantique
"swipe gagne sur tap si déplacement > 50px". Cohérent.

Voir BACKLOG.md à la racine pour un fix candidat (filtrer le tracking
de swipe quand `e.target` est dans `<fn-overlay-buttons>`).

### Wheel sur trackpad MacBook

Les trackpads MacBook émettent des `wheel` events à très haute fréquence
(ratio horaire/vertical mixés). Le throttle 400ms gère bien : 1 swipe
trackpad complet = 1 changement de floor, comme attendu.

### Mode `none` pour navigation

`settings.navigation_mode: none` désactive complètement la navigation
(ni wheel ni swipe). La card devient un dashboard statique avec
seulement le floor de départ. Use case rare mais valide.

## Questions ouvertes

Aucune.

## Décisions

Pas d'ADR formel. Les seuils (50px déplacement, 0.3px/ms vélocité,
400ms throttle, 150ms bounce) ont été calibrés empiriquement sur Pixel
9 Pro XL et poste desktop pendant le dev. Ajustables sans changement de
spec si retours utilisateurs justifient.
