---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [color-scheme.md, overlays-toggle.md, ../architecture/component-tree.md]
---

# Data Model

API publique YAML de la card. Schéma complet, champs, types, valeurs par
défaut, tap_actions. **Spec figée jusqu'à v1.0** — toute évolution doit
être backward-compatible.

## Contexte

Le data model est l'API publique du composant : c'est ce que les
utilisateurs écrivent dans leur YAML de Lovelace. Il doit être lisible
pour un humain qui édite à la main, prévisible (pas de surprise sur les
valeurs par défaut), et cohérent avec les conventions HA standard
(snake_case, format des tap_actions).

## Objectifs

1. Lisibilité YAML pour édition manuelle
2. Compat backward jusqu'à v1.0 sur tous les champs
3. Cohérence avec les conventions HA pour les tap_actions
4. Coordonnées dans un système isolé des dimensions réelles (viewBox)

## Scope

### In

- Schéma YAML complet
- Types et obligations de chaque champ
- Valeurs par défaut
- Format des tap_actions

### Out

- Couleurs d'état et CSS variables (voir
  [`color-scheme.md`](color-scheme.md))
- Mécanique du toggle d'overlays (voir
  [`overlays-toggle.md`](overlays-toggle.md))
- Implémentation des composants (voir
  [`../architecture/component-tree.md`](../architecture/component-tree.md))

## Comportement attendu — Structure conceptuelle

```
Card
├── viewbox (système de coordonnées global, std SVG)
├── settings (transition, navigation, etc.)
├── floors[] (liste ordonnée du HAUT vers le BAS)
│   ├── id (identifiant logique)
│   ├── name (label affiché)
│   └── background (chemin vers l'image)
└── overlays[] (couches transverses globales)
    ├── id
    ├── name
    ├── icon (pour la barre de toggle)
    ├── default_visible
    └── elements[]
        ├── floor (sur quel floor l'élément vit)
        ├── entity (entity_id HA)
        ├── position { x, y } (en coordonnées viewBox)
        ├── type (icon | text)
        ├── tap_action (action HA standard)
        └── ... (props spécifiques au type)
```

## Comportement attendu — Schéma YAML complet

```yaml
type: custom:floor-navigator-card

# Système de coordonnées global (standard SVG)
viewbox: "0 0 1920 1080"

# Configuration globale du comportement
settings:
  transition: crossfade            # crossfade | slide | slide-scale
  transition_duration: 400         # ms, 100-2000
  start_floor: L0                  # id d'un floor déclaré
  navigation_mode: both            # wheel | swipe | both | none
  edge_behavior: bounce            # bounce | none | loop
  show_floor_indicator: true
  overlay_buttons_position: bottom # top | bottom | none

# Liste des floors (ORDRE = du HAUT vers le BAS dans la maison)
# Le scroll vers le bas avance dans cette liste : L0 → L1 → L2
floors:
  - id: L0
    name: "Rez-de-chaussée"
    background: /local/floorplans/L0.png

  - id: L1
    name: "Étage 1"
    background: /local/floorplans/L1.png

  - id: L2
    name: "Bureau et combles"
    background: /local/floorplans/L2.png

# Overlays : couches transverses aux floors
overlays:
  - id: lights
    name: Éclairage
    icon: mdi:lightbulb
    default_visible: true
    elements:
      - floor: L0
        entity: light.salon
        position: { x: 600, y: 450 }
        type: icon
        icon: mdi:lightbulb
        tap_action: toggle

  - id: temperature
    name: Températures
    icon: mdi:thermometer
    default_visible: false
    elements:
      - floor: L1
        entity: sensor.ct_chambre_alice_temperature
        position: { x: 850, y: 320 }
        type: text
        unit: "°C"
        precision: 1
```

## Comportement attendu — Spécification des champs

### Card root

| Champ | Type | Obligatoire | Défaut | Description |
|---|---|---|---|---|
| `type` | string | ✅ | — | Toujours `"custom:floor-navigator-card"` |
| `viewbox` | string | ✅ | — | Format SVG viewBox standard, ex: `"0 0 1920 1080"` |
| `settings` | object | ❌ | défauts ci-dessous | Configuration globale |
| `floors` | array | ✅ | — | Liste ordonnée des floors (min 1) |
| `overlays` | array | ❌ | `[]` | Liste des overlays |

### Settings

| Champ | Type | Défaut | Valeurs |
|---|---|---|---|
| `transition` | enum | `crossfade` | `crossfade`, `slide`, `slide-scale` |
| `transition_duration` | int (ms) | `400` | 100-2000 |
| `start_floor` | string | premier floor | id d'un floor déclaré |
| `navigation_mode` | enum | `both` | `wheel`, `swipe`, `both`, `none` |
| `edge_behavior` | enum | `bounce` | `bounce`, `none`, `loop` |
| `show_floor_indicator` | bool | `true` | — |
| `overlay_buttons_position` | enum | `bottom` | `top`, `bottom`, `none` |

### Floor

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | ✅ | Identifiant unique parmi les floors |
| `name` | string | ✅ | Label affiché dans l'indicateur |
| `background` | string | ✅ | Path/URL de l'image (PNG, JPG, SVG) |

### Overlay

| Champ | Type | Obligatoire | Défaut | Description |
|---|---|---|---|---|
| `id` | string | ✅ | — | Identifiant unique parmi les overlays |
| `name` | string | ✅ | — | Label affiché sur le bouton de toggle |
| `icon` | string (MDI) | ❌ | `mdi:layers` | Icône du bouton de toggle |
| `default_visible` | bool | ❌ | `false` | Visibilité initiale |
| `elements` | array | ✅ | — | Liste des éléments de cet overlay |

### Element (commun)

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `floor` | string | ✅ | id d'un floor déclaré |
| `entity` | string | ✅ | entity_id HA |
| `position` | object | ✅ | `{ x: number, y: number }` en coords viewBox |
| `type` | enum | ✅ | `icon` ou `text` |
| `tap_action` | object/string | ❌ | Action HA standard |

### Element type `icon`

| Champ | Type | Obligatoire | Défaut | Description |
|---|---|---|---|---|
| `icon` | string (MDI) | ❌ | dérivé du domaine de l'entity | Icône MDI à afficher |
| `size` | int (viewBox units) | ❌ | `48` | Taille du carré d'icône |

### Element type `text`

| Champ | Type | Obligatoire | Défaut | Description |
|---|---|---|---|---|
| `unit` | string | ❌ | `unit_of_measurement` de l'entité | Suffixe affiché |
| `precision` | int | ❌ | `1` | Nb de décimales |
| `font_size` | int | ❌ | `24` | Taille de police en viewBox units |

## Comportement attendu — Tap actions

Format identique à HA standard. Voir
https://www.home-assistant.io/dashboards/actions/

### Forme courte (string)

```yaml
tap_action: toggle
```

### Forme longue (object)

```yaml
tap_action:
  action: call-service
  service: light.turn_on
  service_data:
    entity_id: light.salon
    brightness: 200
```

### Actions supportées en v0.1.0

- `toggle`
- `more-info`
- `navigate` (avec `navigation_path`)
- `call-service` (avec `service` + `service_data`)
- `url` (avec `url_path`)
- `none`

### Comportement par défaut si `tap_action` absent

`more-info` (ouvre la modale standard HA). Cohérent avec les autres
custom cards de l'écosystème.

### `tap_action: none`

L'icône reste visible et colorée, mais ne réagit pas au clic. Le
curseur n'est pas un pointer en survol. Use case : éléments purement
informatifs (badges de présence, état d'AP).

## Cas limites

### Floor référencé par un élément mais pas déclaré

Élément avec `floor: L99` alors que `floors` ne contient que L0/L1/L2.
Comportement : l'élément n'est rendu sur aucun floor (silencieux). Pas
d'erreur explicite en v0.1.0. Validation runtime à durcir en v0.2.0+
si retours utilisateurs (warning console au moins).

### Entité inexistante dans HA

`entity: light.nonexistent`. Comportement : l'élément est rendu en état
`unavailable` (couleur rouge sombre, valeur `?` pour le type text).
Cohérent avec le comportement standard HA pour les entités manquantes.

### Position hors viewBox

`position: { x: 9999, y: 9999 }` alors que `viewbox: "0 0 1920 1080"`.
Comportement : l'élément est rendu mais hors-vue. Pas d'erreur. Le SVG
gère naturellement les coordonnées hors viewBox sans clip par défaut.

### Coordonnées négatives

`position: { x: -50, y: -50 }`. Comportement : l'élément est rendu en
haut-gauche, partiellement hors-vue. Pas d'erreur. Use case rare mais
valide (déborder volontairement).

### Float vs int sur `precision`

`precision: 1.5`. Comportement : tronqué à 1 (Math.floor) avant usage
dans `toFixed()`. Pas d'erreur explicite. Bonnes pratiques YAML : utiliser
des integers.

### Multiple éléments même `entity` dans des overlays différents

`light.salon` apparaît dans overlay `lights` ET overlay `energie`. Les
deux éléments sont rendus indépendamment (positions et props
indépendantes). Pas de conflit. Voir BACKLOG.md pour use case à
documenter.

## Questions ouvertes

Aucune.

## Décisions

Le data model a été figé en début de design session (2026-05-01) sans
ADRs individuels. Les choix structurants étaient :

- **Overlays globaux transverses** (vs un overlay par floor) : permet
  de regrouper sémantiquement (tous les éclairages dans un même
  overlay) et de toggleer cohéremment
- **Coordonnées viewBox** (vs pourcentages ou pixels absolus) : isole
  les positions de la dimension réelle de la card, scale naturellement
- **tap_action format HA standard** (vs format custom) : compat directe
  avec `custom-card-helpers`, pas de surprise pour les utilisateurs
- **Convention scroll-aligned** (down → suivant) : intuitive desktop
  ET mobile, alignée avec le scroll de page classique
