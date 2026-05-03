---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [data-model.md, ../architecture/conventions.md]
---

# Color Scheme

Couleurs d'état des éléments et CSS variables exposées pour customisation.
Spec figée pour la v0.1.0.

## Contexte

Les éléments d'overlay (icônes, texte) doivent refléter l'état des
entités HA visuellement, sans config explicite par l'utilisateur basique.
Le standard HA a des conventions de couleurs par domaine (jaune pour
lampes, vert pour switches, rouge pour erreurs) qu'on suit. Les
utilisateurs avancés doivent pouvoir override via card-mod ou via le
thème Lovelace.

## Objectifs

1. Couleurs sensées par défaut sans config (pattern HA standard)
2. CSS variables exposées avec noms prédictibles
3. Override possible via card-mod ou thème Lovelace
4. Lisibilité sur fonds clairs ET sombres (contrast ratio acceptable)

## Scope

### In

- Couleurs par défaut par domaine et état
- CSS variables exposées pour override
- Pattern de nommage des variables

### Out

- Mécanisme dark mode pour les images de fond (sera couvert par
  `features/dark-mode.md` en v0.1.1)
- Champs de config qui pilotent les couleurs (pas de champ direct, tout
  passe par CSS variables)

## Comportement attendu — Couleurs par défaut

Le composant applique automatiquement des couleurs selon le **domaine de
l'entité** et son **état**. L'utilisateur basique n'a rien à configurer.

### CSS variables exposées

```css
:host {
  /* États génériques */
  --fn-color-on:           rgb(255, 193, 7);    /* jaune amber, état actif */
  --fn-color-off:          rgb(120, 120, 120);  /* gris, état inactif */
  --fn-color-unavailable:  rgb(180, 80, 80);    /* rouge sombre */

  /* Domaines spécifiques (override les génériques) */
  --fn-color-light-on:     rgb(255, 193, 7);
  --fn-color-light-off:    rgb(120, 120, 120);
  --fn-color-switch-on:    rgb(76, 175, 80);
  --fn-color-switch-off:   rgb(120, 120, 120);
  --fn-color-binary_sensor-on:  rgb(33, 150, 243);
  --fn-color-binary_sensor-off: rgb(120, 120, 120);

  /* Texte (overlay type "text") */
  --fn-color-text:         rgb(255, 255, 255);
  --fn-text-shadow:        0 0 4px rgba(0, 0, 0, 0.8);

  /* UI chrome */
  --fn-floor-indicator-bg:    rgba(0, 0, 0, 0.6);
  --fn-floor-indicator-color: white;
  --fn-overlay-button-bg:     rgba(0, 0, 0, 0.5);
  --fn-overlay-button-active-bg: rgba(255, 193, 7, 0.8);
}
```

## Comportement attendu — Cascade de résolution

Pour une entité donnée, l'algorithme de résolution de couleur :

```
1. Lire le domaine de l'entité (light, switch, binary_sensor, sensor, ...)
2. Lire l'état (on, off, unavailable, ou valeur numérique pour sensor)
3. Chercher --fn-color-{domain}-{state}
   ├── Trouvé → utiliser cette couleur
   └── Non trouvé → fallback sur --fn-color-{state} (générique)
4. Si l'état n'est ni on/off/unavailable, utiliser la couleur "on"
   par défaut (pour les sensors avec valeur)
```

Exemple concret :
- `light.salon` état `on` → résout `--fn-color-light-on` (jaune amber)
- `switch.cafetiere` état `on` → résout `--fn-color-switch-on` (vert)
- `sensor.temperature` valeur `21.5` → résout `--fn-color-on` (générique
  jaune amber)

## Comportement attendu — Override par l'utilisateur

### Via card-mod (style local)

```yaml
card_mod:
  style: |
    :host {
      --fn-color-light-on: red;
    }
```

### Via thème Lovelace (style global)

```yaml
# themes.yaml
my_theme:
  fn-color-light-on: "#ff5500"
  fn-color-switch-on: "#00ff88"
```

Le thème Lovelace s'applique au niveau `:root` et est hérité par tous
les composants enfants, donc les variables `--fn-*` sont accessibles
automatiquement.

## Comportement attendu — Texte

Pour les éléments type `text`, deux variables :

- `--fn-color-text` : couleur de la police (blanc par défaut)
- `--fn-text-shadow` : ombre portée pour lisibilité sur fonds variés
  (par défaut, ombre noire avec blur 4px)

L'ombre permet une bonne lisibilité même sur des plans clairs (bandes
blanches de mur, par exemple). Override possible :

```yaml
card_mod:
  style: |
    :host {
      --fn-color-text: black;
      --fn-text-shadow: 0 0 4px rgba(255, 255, 255, 0.9);
    }
```

## Cas limites

### État custom non standard

Une entité peut avoir un état non standard (ex: `media_player` avec
état `playing`, `paused`, `idle`). Comportement actuel : seuls
`on`/`off`/`unavailable` ont des couleurs spécifiques. Les autres
tombent sur `--fn-color-on` par défaut.

À étendre en v0.2.0+ si besoin via une mécanique de mapping
domaine→états→couleurs plus riche.

### Couleurs et accessibilité

Les couleurs par défaut ont été choisies empiriquement, pas via une
analyse formelle du contrast ratio. Pour des utilisateurs avec besoins
d'accessibilité, utiliser un thème Lovelace dédié qui override les
variables avec des couleurs plus contrastées.

### Conflit avec le thème HA dark/light

Le thème Lovelace global peut définir des CSS variables qui rentrent en
conflit avec celles du composant. Pas de mécanisme de réconciliation —
le dernier override applique. C'est conforme à la cascade CSS standard.

### Couleurs et dark mode

Le dark mode (v0.1.1) ne change pas les CSS variables des couleurs
d'état — seulement l'image de fond. Les couleurs d'éléments restent
identiques en mode light et dark (jaune pour lampe on dans les deux).
Si des couleurs spécifiques au dark mode sont voulues, l'utilisateur
peut les définir dans un thème HA dark.

## Questions ouvertes

Aucune.

## Décisions

Pas d'ADR formel. Les couleurs par défaut suivent les conventions HA
standard (notamment les couleurs Material Design utilisées par les
icônes natives HA pour les domaines correspondants).
