---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [data-model.md, ../architecture/component-tree.md]
---

# Overlays Toggle

Mécanisme de bascule de visibilité des overlays. État local non persisté
en v0.1.0, extension v0.2.0+ vers binding HA. Spec figée pour la v0.1.0.

## Contexte

Les overlays regroupent les éléments par thématique (lampes, températures,
présence, infrastructure). L'utilisateur veut pouvoir afficher/masquer
chaque overlay indépendamment pour réduire la densité visuelle quand il
ne s'intéresse qu'à un sujet à la fois.

Pour la v0.1.0, on vise simple : état local mémorisé pendant la session,
réinitialisé selon `default_visible` à chaque rechargement. Les use cases
plus avancés (synchroniser entre plusieurs dashboards, persister entre
sessions) sont différés en v0.2.0+ via binding à des entités HA.

## Objectifs

1. Toggle d'overlay en un clic, retour visuel immédiat
2. État initial piloté par la config (`default_visible`)
3. Pas de surprise : l'utilisateur sait que c'est local et non persisté
4. Mécanique extensible vers binding HA en v0.2.0+ sans casser l'API

## Scope

### In

- Mécanique d'état local v0.1.0
- Initialisation depuis `default_visible`
- Barre de boutons UI
- Pattern d'extension v0.2.0+ (binding `input_boolean`)

### Out

- Composant UI lui-même (voir
  [`../architecture/component-tree.md`](../architecture/component-tree.md)
  pour `<fn-overlay-buttons>`)
- Champs de config (voir [`data-model.md`](data-model.md))

## Comportement attendu — État local v0.1.0

### Stockage

État dans une `@state() visibleOverlays: Set<string>` du composant racine
`floor-navigator-card`.

Le `Set<string>` contient les `id` des overlays actuellement visibles.

### Initialisation

Au premier render après `setConfig()` :

```
visibleOverlays = new Set(
  config.overlays
    .filter(o => o.default_visible === true)
    .map(o => o.id)
)
```

Les overlays avec `default_visible: true` sont visibles au démarrage.
Les autres (défaut `false`) sont cachés.

### Modification

Les boutons de la barre `<fn-overlay-buttons>` émettent un event custom
`overlay-toggle` avec l'overlay id. Le composant racine intercepte et
met à jour `visibleOverlays` :

```
toggleOverlay(id) {
  const next = new Set(visibleOverlays);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  visibleOverlays = next;  // nouvelle référence pour Lit reactive
}
```

La nouvelle référence (`new Set(...)`) est nécessaire pour que Lit
détecte le changement et re-render (pas de mutation in-place).

### Propagation

`visibleOverlays` est passé en prop down à `<fn-floor>` puis à
`<fn-overlay-layer>`. Chaque overlay layer applique
`display: none` ou `display: block` selon que son id est dans le Set.

### Persistance

**Non persisté** en v0.1.0. État perdu au refresh de la page, reset
selon `default_visible` à chaque chargement. Comportement assumé pour la
v0.1.0 — extension prévue.

## Comportement attendu — UI

### Barre de boutons

La barre `<fn-overlay-buttons>` est positionnée en bas (défaut) ou en
haut, ou cachée, selon `settings.overlay_buttons_position`.

Pour chaque overlay déclaré, un bouton :
- Affiche l'icône (`overlay.icon`, défaut `mdi:layers`)
- Affiche le label (`overlay.name`)
- État visuel "actif" si l'id est dans `visibleOverlays`
- Tap → émet `overlay-toggle` avec l'id

### Style des boutons

Un bouton actif a un fond `--fn-overlay-button-active-bg` (jaune amber
translucide par défaut). Un bouton inactif a un fond
`--fn-overlay-button-bg` (noir translucide par défaut). Voir
[`color-scheme.md`](color-scheme.md) pour les CSS variables.

### `overlay_buttons_position: none`

Si `none`, la barre n'est pas rendue. L'utilisateur n'a alors aucun moyen
de toggler les overlays interactivement (sauf code custom). Use case
rare : dashboards verrouillés où la config définit ce qui est visible et
l'utilisateur ne peut pas changer.

## Comportement attendu — Extension v0.2.0+ (binding HA)

Spec d'orientation pour ne pas casser l'API en v0.2.0. **Pas implémenté
en v0.1.0**.

### Champ de config

Ajout optionnel d'un champ `visible_entity` au niveau de chaque overlay :

```yaml
overlays:
  - id: lights
    name: Éclairage
    default_visible: true
    visible_entity: input_boolean.show_lights_overlay  # nouveau v0.2.0+
    elements: [...]
```

### Comportement

- Si `visible_entity` est défini : la visibilité est lue depuis l'état
  de l'entité HA (`on`/`off`). Le toggle UI met à jour l'entité via
  service call (`input_boolean.toggle`). État synchronisé entre tous
  les dashboards et persistant.
- Si `visible_entity` n'est pas défini : comportement v0.1.0 (état local).

Compat backward parfaite : les configs v0.1.0 sans `visible_entity`
fonctionnent inchangées.

## Cas limites

### Pas d'overlays

`overlays: []` ou `overlays` absent. Comportement : `<fn-overlay-buttons>`
n'est pas rendu (barre vide cachée). Pas d'erreur, juste une card sans
overlays interactifs.

### Tous les overlays cachés au départ

Tous les overlays ont `default_visible: false` (ou non spécifié). Au
chargement, aucun élément n'est visible sur les plans. La barre de
boutons est rendue avec tous les boutons inactifs. L'utilisateur clique
pour activer.

### Overlay avec id dupliqué

Deux overlays avec le même `id`. Comportement : le `Set<string>` ne
distingue pas les doublons, donc toggler l'un toggle aussi l'autre. Pas
d'erreur explicite. Bonnes pratiques YAML : ids uniques (à valider
manuellement, pas de validation runtime en v0.1.0).

### Toggle pendant une transition

L'utilisateur clique sur un bouton d'overlay pendant qu'une transition
de floor est en cours. Comportement : le toggle s'applique
immédiatement, l'overlay devient visible/caché sur tous les floors. La
transition de floor continue son cours. Pas de conflit visuel.

### `default_visible` modifié au runtime

L'utilisateur modifie sa config Lovelace et change `default_visible: true`
en `false`. Comportement : au prochain `setConfig()` (recharge du
dashboard), `visibleOverlays` est ré-initialisé selon la nouvelle
valeur. État précédent perdu. Cohérent avec "pas de persistance".

## Questions ouvertes

Aucune.

## Décisions

Pas d'ADR formel. Le choix "état local v0.1.0 + binding entité v0.2.0+"
permet de livrer rapidement une feature minimale fonctionnelle et de
l'étendre proprement quand le besoin de synchronisation se manifeste.
Pattern récurrent dans l'écosystème custom cards (cf. button-card qui a
suivi un parcours similaire).
