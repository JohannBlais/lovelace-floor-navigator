# lovelace-floor-navigator — Specification v0.1.0

> Carte Lovelace pour Home Assistant qui affiche votre maison en plusieurs niveaux empilés, avec navigation fluide à la molette ou au swipe, et des overlays SVG configurables pour visualiser et contrôler vos entités directement sur le plan.

**Auteur** : Johann Blais
**Date de spec** : 2026-05-01
**Révision spec** : 1.1 (workflow dev aligné sur conventions HACS standards)
**Statut** : Spec figée pour v0.1.0, prête pour scaffolding

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Identité du composant](#2-identité-du-composant)
3. [Modèle de données (API publique)](#3-modèle-de-données-api-publique)
4. [Architecture interne](#4-architecture-interne)
5. [Stack technique](#5-stack-technique)
6. [Workflow de développement](#6-workflow-de-développement)
7. [Roadmap](#7-roadmap)
8. [Premières étapes pour Claude Code](#8-premières-étapes-pour-claude-code)
9. [Annexes](#9-annexes)

---

## 1. Résumé exécutif

### Vision

Une carte Lovelace qui transforme tes plans 2D de maison en un dashboard interactif. L'utilisateur navigue verticalement entre les niveaux à la molette (desktop) ou au swipe (mobile), et superpose des couches d'information sur les plans (lampes contrôlables, températures, présence, infrastructure réseau...).

### Public cible

Utilisateurs Home Assistant qui :
- Ont des plans 2D de leur logement (PNG, JPG ou SVG)
- Veulent une vue spatiale de leur maison plutôt que des cards par pièce
- Sont à l'aise avec une config YAML (l'éditeur visuel viendra plus tard)

### Différenciation vs alternatives existantes

- **Picture-Elements (natif HA)** : statique, vue figée, pas de navigation entre plans
- **Floorplan (HACS, pkozul)** : 1 SVG = 1 vue, pas de pattern multi-niveaux
- **ha-floorplan** : idem
- **floor-navigator** : navigation native multi-niveaux + overlays modulaires

### Périmètre v0.1.0

Voir section 7 pour la liste exhaustive. En une phrase : **navigation verticale fluide entre N niveaux, overlays icônes/texte cliquables, config YAML.**

---

## 2. Identité du composant

### Nomenclature

| Élément | Valeur |
|---------|--------|
| Nom du repo GitHub | `lovelace-floor-navigator` |
| Owner GitHub | `JohannBlais` |
| Nom de la card en YAML | `custom:floor-navigator` |
| Custom element tag | `<floor-navigator-card>` |
| Nom de la classe TS | `FloorNavigatorCard` |
| Nom du package npm | `lovelace-floor-navigator` |
| Nom marketing HACS | "Floor Navigator" |

### Licence

MIT (standard HACS, permet réutilisation maximale).

---

## 3. Modèle de données (API publique)

L'API publique est figée. Tout ajout doit être backward-compatible jusqu'à v1.0.0.

### 3.1 Structure conceptuelle

```
Card
├── viewbox (système de coordonnées global, std SVG)
├── settings (transition, navigation, etc.)
├── floors[] (liste ordonnée du HAUT vers le BAS)
│   ├── id (identifiant logique)
│   ├── name (label affiché)
│   └── background (chemin vers l'image)
└── overlays[] (couches transverses, A2 — globales)
    ├── id
    ├── name
    ├── icon (pour la barre de toggle)
    ├── default_visible
    └── elements[]
        ├── floor (sur quel floor l'élément vit)
        ├── entity (entity_id HA)
        ├── position { x, y } (en coordonnées viewBox)
        ├── type (icon | text)
        ├── tap_action (toggle | more-info | navigate | call-service | url | none)
        └── ... (props spécifiques au type)
```

### 3.2 Schéma YAML complet

```yaml
type: custom:floor-navigator

# Système de coordonnées global (standard SVG)
viewbox: "0 0 1920 1080"

# Configuration globale du comportement
settings:
  # Transition entre floors : crossfade (défaut) | slide | slide-scale
  transition: crossfade

  # Durée de la transition en ms (défaut: 400)
  transition_duration: 400

  # Floor affiché au démarrage (id d'un floor déclaré)
  start_floor: L0

  # Mode de navigation : wheel | swipe | both (défaut: both)
  navigation_mode: both

  # Convention scroll : scroll vers le bas = floor SUIVANT dans la liste
  # (scroll-aligned, intuitif desktop + mobile)

  # Comportement aux extrémités : bounce (défaut) | none | loop
  edge_behavior: bounce

  # Affichage de l'indicateur de floor courant
  show_floor_indicator: true

  # Position de la barre de boutons d'overlay : top | bottom | none (défaut: bottom)
  overlay_buttons_position: bottom

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
        icon: mdi:lightbulb              # icône MDI pour le rendu
        tap_action: toggle

      - floor: L0
        entity: light.cuisine
        position: { x: 1200, y: 380 }
        type: icon
        icon: mdi:lightbulb
        tap_action: toggle

      - floor: L1
        entity: light.chambre_alice
        position: { x: 800, y: 300 }
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

      - floor: L0
        entity: sensor.ct_salon_temperature
        position: { x: 620, y: 470 }
        type: text
        unit: "°C"
        precision: 1

  - id: presence
    name: Présence
    icon: mdi:motion-sensor
    default_visible: false
    elements:
      - floor: L1
        entity: binary_sensor.cm_chambre_antoine_occupancy
        position: { x: 400, y: 280 }
        type: icon
        icon: mdi:human

  - id: infra
    name: Infrastructure réseau
    icon: mdi:wifi
    default_visible: false
    elements:
      - floor: L0
        entity: sensor.wifi_ap_l0_etat_de_l_appareil
        position: { x: 700, y: 500 }
        type: icon
        icon: mdi:access-point
        tap_action: more-info

      - floor: L2
        entity: sensor.wifi_ap_l2_etat_de_l_appareil
        position: { x: 950, y: 420 }
        type: icon
        icon: mdi:access-point
        tap_action: more-info
```

### 3.3 Spécification des champs

#### 3.3.1 Card root

| Champ | Type | Obligatoire | Défaut | Description |
|-------|------|-------------|--------|-------------|
| `type` | string | ✅ | — | Toujours `"custom:floor-navigator"` |
| `viewbox` | string | ✅ | — | Format SVG viewBox standard, ex: `"0 0 1920 1080"` |
| `settings` | object | ❌ | voir 3.3.2 | Configuration globale |
| `floors` | array | ✅ | — | Liste ordonnée des floors (min 1) |
| `overlays` | array | ❌ | `[]` | Liste des overlays |

#### 3.3.2 Settings

| Champ | Type | Défaut | Valeurs |
|-------|------|--------|---------|
| `transition` | enum | `crossfade` | `crossfade`, `slide`, `slide-scale` |
| `transition_duration` | int (ms) | `400` | 100-2000 |
| `start_floor` | string | premier floor | id d'un floor déclaré |
| `navigation_mode` | enum | `both` | `wheel`, `swipe`, `both`, `none` |
| `edge_behavior` | enum | `bounce` | `bounce`, `none`, `loop` |
| `show_floor_indicator` | bool | `true` | — |
| `overlay_buttons_position` | enum | `bottom` | `top`, `bottom`, `none` |

#### 3.3.3 Floor

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | Identifiant unique parmi les floors |
| `name` | string | ✅ | Label affiché dans l'indicateur |
| `background` | string | ✅ | Path/URL de l'image (PNG, JPG, SVG) |

#### 3.3.4 Overlay

| Champ | Type | Obligatoire | Défaut | Description |
|-------|------|-------------|--------|-------------|
| `id` | string | ✅ | — | Identifiant unique parmi les overlays |
| `name` | string | ✅ | — | Label affiché sur le bouton de toggle |
| `icon` | string (MDI) | ❌ | `mdi:layers` | Icône du bouton de toggle |
| `default_visible` | bool | ❌ | `false` | Visibilité initiale |
| `elements` | array | ✅ | — | Liste des éléments de cet overlay |

#### 3.3.5 Element (commun)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `floor` | string | ✅ | id d'un floor déclaré |
| `entity` | string | ✅ | entity_id HA |
| `position` | object | ✅ | `{ x: number, y: number }` en coords viewBox |
| `type` | enum | ✅ | `icon` ou `text` |
| `tap_action` | object/string | ❌ | Action HA standard |

#### 3.3.6 Element type `icon`

| Champ | Type | Obligatoire | Défaut | Description |
|-------|------|-------------|--------|-------------|
| `icon` | string (MDI) | ❌ | dérivé du domaine de l'entity | Icône MDI à afficher |
| `size` | int (viewBox units) | ❌ | `48` | Taille du carré d'icône |

#### 3.3.7 Element type `text`

| Champ | Type | Obligatoire | Défaut | Description |
|-------|------|-------------|--------|-------------|
| `unit` | string | ❌ | `unit_of_measurement` de l'entité | Suffixe affiché |
| `precision` | int | ❌ | `1` | Nb de décimales |
| `font_size` | int | ❌ | `24` | Taille de police en viewBox units |

#### 3.3.8 Tap actions

Format identique à HA standard. Voir https://www.home-assistant.io/dashboards/actions/

Forme courte (string) :
```yaml
tap_action: toggle
```

Forme longue (object) :
```yaml
tap_action:
  action: call-service
  service: light.turn_on
  service_data:
    entity_id: light.salon
    brightness: 200
```

Actions supportées en v0.1.0 :
- `toggle`
- `more-info`
- `navigate` (avec `navigation_path`)
- `call-service` (avec `service` + `service_data`)
- `url` (avec `url_path`)
- `none`

### 3.4 Couleurs d'état

Le composant applique automatiquement des couleurs selon le **domaine de l'entité** et son **état**. L'utilisateur basique n'a rien à configurer.

#### 3.4.1 Couleurs par défaut (CSS variables exposées)

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

#### 3.4.2 Override par l'utilisateur

Via `card-mod` ou via le thème Lovelace :

```yaml
card_mod:
  style: |
    :host {
      --fn-color-light-on: red;
    }
```

---

## 4. Architecture interne

### 4.1 Structure des composants Lit

L'arbre de composants à l'exécution :

```
<floor-navigator-card>           # composant racine, gère config + state global
  └── <fn-navigation-controller>  # gère wheel/swipe/transition state
      ├── <fn-floor-stack>        # conteneur des floors empilés (CSS stratégie 3)
      │   ├── <fn-floor>          # un par floor déclaré
      │   │   ├── <svg>           # background + overlays
      │   │   │   ├── <image href="background">
      │   │   │   ├── <fn-overlay-layer> (×N)
      │   │   │   │   └── <fn-element> (×M)  # icon ou text
      │   ├── <fn-floor>
      │   └── <fn-floor>
      ├── <fn-floor-indicator>    # label "L0 — Rez-de-chaussée"
      └── <fn-overlay-buttons>    # barre de boutons toggle
```

### 4.2 Convention de nommage des IDs SVG

Préfixe `fn-` (Floor Navigator) pour éviter collisions :

| Pattern | Description |
|---------|-------------|
| `fn-floor-{floor_id}` | Wrapper `<g>` du floor entier |
| `fn-floor-{floor_id}-bg` | `<image>` background |
| `fn-floor-{floor_id}-overlay-{overlay_id}` | Wrapper `<g>` d'un overlay sur ce floor |
| `fn-element-{entity_id_normalized}` | Wrapper d'un élément (point→tiret pour les IDs) |

Exemple :

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

### 4.3 Stratégie de rendu

**Stratégie 3 — Hybride** :
- Tous les floors sont rendus en permanence dans le DOM
- Empilés via CSS (position absolue, même origine, transform translateY)
- Bascule de visibilité via CSS classes (`fn-floor-active`, `fn-floor-prev`, `fn-floor-next`)
- Les transitions sont des animations CSS sur transform/opacity selon le mode choisi

### 4.4 Reactive updates

**Approche B — Reactive properties par element** :
- `<fn-element>` est un LitElement avec `@property() hass: HomeAssistant`
- Lit re-render uniquement les elements dont l'entité a changé
- Pattern standard HA, pas de surprise

### 4.5 Toggle de visibilité des overlays

**Mécanisme A — État local v0.1.0** :
- État dans une `@state() visibleOverlays: Set<string>` du composant racine
- Initialisé depuis `default_visible` de chaque overlay
- Modifié par les boutons UI (et accessoirement par event keyboard si on l'ajoute)
- Non persisté (perdu au refresh, reset selon `default_visible`)
- Sera étendu en v0.2.0 vers binding `input_boolean`

### 4.6 Gestion de la navigation

#### 4.6.1 Détection wheel (desktop)

- Listener `wheel` sur le conteneur racine
- Throttle pour éviter les sauts multiples : 1 floor change par 400ms minimum
- Direction `deltaY > 0` → floor suivant dans la liste, `deltaY < 0` → précédent

#### 4.6.2 Détection swipe (mobile/touch)

- Listeners `touchstart` / `touchmove` / `touchend`
- Seuil de déclenchement : 50px de déplacement vertical minimum
- Vélocité minimale : 0.3px/ms (pour distinguer scroll lent vs swipe intentionnel)
- Direction down → floor suivant, up → précédent (cohérent avec wheel)

#### 4.6.3 Comportement aux extrémités

`edge_behavior: bounce` (défaut) :
- Animation CSS de "rebond" (~150ms, easing back-out, amplitude 20px) appliquée au floor courant
- Aucun changement de floor effectif
- Indicateur visuel implicite : l'utilisateur comprend qu'il est en butée

`edge_behavior: none` : rien ne se passe.

`edge_behavior: loop` : on revient au floor opposé (L0 ↔ Ln).

---

## 5. Stack technique

### 5.1 Dépendances

```json
{
  "dependencies": {
    "lit": "^3.0.0",
    "custom-card-helpers": "^1.9.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@rollup/plugin-typescript": "^11.1.0",
    "@rollup/plugin-node-resolve": "^15.2.0",
    "@rollup/plugin-commonjs": "^25.0.0",
    "@rollup/plugin-terser": "^1.0.0",
    "rollup": "^4.0.0",
    "tslib": "^2.6.0",
    "dotenv": "^16.0.0"
  }
}
```

### 5.2 Configuration TypeScript

`tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 5.3 Configuration Rollup

`rollup.config.js` (single bundle, output configurable selon mode dev/prod) :

```javascript
import 'dotenv/config';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

// En mode watch (dev), on écrit directement dans le HA local si configuré.
// En mode build (prod), on écrit dans dist/ pour les releases.
const isWatch = process.env.ROLLUP_WATCH === 'true';
const haLocalDir = process.env.HA_LOCAL_DIR;
const outputDir = (isWatch && haLocalDir) ? haLocalDir : 'dist';

const isProd = !isWatch;

export default {
  input: 'src/floor-navigator-card.ts',
  output: {
    file: `${outputDir}/floor-navigator.js`,
    format: 'es',
    sourcemap: !isProd,
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    isProd && terser(),
  ].filter(Boolean),
};
```

### 5.4 Structure du repo

```
lovelace-floor-navigator/
├── .github/
│   └── workflows/
│       ├── build.yml          # build sur PR
│       └── release.yml        # build + release auto sur tag
├── docs/
│   ├── SPEC.md                # ce document
│   ├── examples/              # configs YAML d'exemple
│   │   ├── minimal.yaml
│   │   ├── full-house.yaml
│   │   └── README.md
│   └── screenshots/
├── dev/
│   ├── index.html             # page de test standalone (mode dev rapide)
│   ├── mock-hass.ts           # mock du hass object pour dev local
│   └── test-floors/           # SVG/PNG de test
├── src/
│   ├── floor-navigator-card.ts          # composant racine
│   ├── components/
│   │   ├── fn-navigation-controller.ts
│   │   ├── fn-floor-stack.ts
│   │   ├── fn-floor.ts
│   │   ├── fn-overlay-layer.ts
│   │   ├── fn-element-icon.ts
│   │   ├── fn-element-text.ts
│   │   ├── fn-floor-indicator.ts
│   │   └── fn-overlay-buttons.ts
│   ├── types/
│   │   ├── config.ts          # interfaces TS pour la config YAML
│   │   └── ha.ts              # types HA réexportés
│   ├── utils/
│   │   ├── config-validator.ts
│   │   ├── color-resolver.ts  # résolution domaine→couleur
│   │   ├── icon-resolver.ts   # résolution domaine→icône MDI par défaut
│   │   └── transition.ts      # logique transitions
│   └── styles/
│       └── card-styles.ts     # CSS variables + base styles
├── dist/                      # gitignored, contient le bundle prod
├── .env.local.example         # template à dupliquer en .env.local
├── .gitignore                 # inclut .env.local et dist/
├── LICENSE                    # MIT
├── README.md                  # description, installation, exemple minimal
├── hacs.json                  # manifest HACS
├── package.json
├── rollup.config.js
└── tsconfig.json
```

### 5.5 Manifest HACS

`hacs.json` minimal :

```json
{
  "name": "Floor Navigator",
  "render_readme": true,
  "filename": "floor-navigator.js"
}
```

### 5.6 Scripts npm

`package.json` extrait :

```json
{
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -c -w",
    "dev": "echo 'Open dev/index.html in a browser via a static server'",
    "lint": "tsc --noEmit"
  }
}
```

- `npm run build` : build prod minifié vers `dist/`
- `npm run watch` : rebuild auto à chaque save, vers `HA_LOCAL_DIR` si configuré, sinon `dist/`
- `npm run dev` : rappel pour lancer la page standalone (cf. section 6.1)
- `npm run lint` : type-checking sans build, utile en CI

---

## 6. Workflow de développement

Deux modes complémentaires, à utiliser selon le besoin. Aligné sur les conventions de l'écosystème HACS (custom-sonos-card, streamline-card, go-hass-cards).

### 6.1 Mode "dev rapide" — page HTML standalone

**Quand l'utiliser** : développement courant, itération sur le visuel, tuning des transitions et des positions d'icônes. C'est le mode par défaut pour 80% du temps de dev.

**Setup** :
- `dev/index.html` charge le bundle compilé avec un mock du `hass` object
- `dev/mock-hass.ts` simule 5-10 entités (1 light, 1 sensor, 1 binary_sensor, etc.) avec des états faux mais réalistes, et un mécanisme pour simuler des state changes
- Servi via un static server local (ex: `npx serve dev/` ou `python -m http.server` depuis `dev/`)
- Reload manuel après `npm run build` (~2s de build)

**Avantages** :
- Itération en quelques secondes
- Pas besoin de HA pour tester
- Debug DOM facile (DevTools natif)
- Hot reload du JS en relançant juste un build

### 6.2 Mode "test intégration" — déploiement HA réel via Samba

**Quand l'utiliser** : avant chaque release v0.1.x, pour valider que la card fonctionne dans le vrai HA avec les vraies entités. Aussi quand un bug ne peut être reproduit qu'avec des données HA réelles.

**Pattern** : convention HACS standard `TARGET_DIRECTORY` via variable d'environnement, lue par Rollup.

**Setup côté HAOS** (une seule fois) :

1. Installer l'add-on **"Samba share"** : Settings → Add-ons → Add-on Store → Samba share → Install
2. Configurer un username + password dédié pour le partage SMB (à stocker dans le vault, tag `infra/haos-samba`)
3. Démarrer l'add-on, activer "Start on boot"

Le partage expose `/config` en SMB, accessible à `\\<haos-ip>\config\`.

**Setup côté poste de dev** (Fatboy) :

1. Mapper le partage `\\192.168.1.61\config\` comme lecteur réseau (ex: lettre `Z:`)
   - Windows : Explorateur → Réseau → entrer `\\192.168.1.61\config` → Connecter avec credentials Samba
2. Dans le repo `lovelace-floor-navigator`, créer un fichier `.env.local` (gitignored) :

```env
# Pointe vers le dossier www/ de HAOS, accessible via le mapping Samba.
# Le sous-dossier floor-navigator/ sera créé au premier build watch.
HA_LOCAL_DIR=Z:/www/floor-navigator
```

3. Vérifier que `Z:/www/` existe (créé automatiquement par HA si la card avait été installée via HACS, sinon le créer manuellement une fois)

**Setup côté Lovelace** (une seule fois) :

Déclarer la ressource dans Lovelace via l'UI :
- Paramètres → Tableaux de bord → Ressources → Ajouter
- URL : `/local/floor-navigator/floor-navigator.js?v=DEV`
- Type : Module JavaScript

**Workflow quotidien** :

1. Lancer `npm run watch` dans le repo
2. Modifier le code dans `src/`
3. À chaque save, Rollup rebuild et écrit directement dans `Z:/www/floor-navigator/floor-navigator.js`
4. Recharger le tableau de bord dans HA avec `Ctrl+Shift+R` (force le bypass du cache navigateur)
5. Voir le changement en direct, sur les vraies entités

**Note sur le cache busting** :

Le query string `?v=DEV` dans la déclaration de ressource ne change pas, donc HA va parfois servir la version cachée. Solutions :
- `Ctrl+Shift+R` après chaque save (le plus fiable au quotidien)
- Pour forcer un reload : changer manuellement `?v=DEV` en `?v=DEV2` dans Resources et reload
- Pour la prod : la GitHub Action de release pourra ajouter automatiquement le hash du commit à la fin du fichier (cf. annexe 9.5)

### 6.3 Cycle de release v0.1.0 (dev local seulement, pas encore HACS)

1. Tester en mode 6.1 puis 6.2 jusqu'à satisfaction
2. Tag git `v0.1.0` sur la branche `main`
3. GitHub Actions build le bundle prod, attache `floor-navigator.js` à la release GitHub
4. Tu peux télécharger ce binaire et le placer manuellement dans `/config/www/floor-navigator/` pour valider que la version "officielle" marche
5. Vivre avec, identifier les bugs ou irritants, fix → `v0.1.1`, etc.

**Pas de soumission HACS en v0.1.x**. La soumission HACS se fait quand le composant est mature (cible : v0.3.0). En attendant, l'utilisateur HACS-aware peut installer la card en ajoutant le repo en "Custom Repository" dans HACS, ce qui permet déjà de tester sans copie manuelle.

---

## 7. Roadmap

### v0.1.0 — Scope figé (cf. spec ci-dessus)

**Fonctionnalités cœur** :
- ✅ Card Lovelace `custom:floor-navigator`
- ✅ Multi-niveaux (1 à N floors)
- ✅ Background PNG/JPG/SVG par floor
- ✅ Système de coordonnées viewBox SVG
- ✅ Navigation molette (desktop)
- ✅ Navigation swipe vertical (mobile)
- ✅ 3 transitions : crossfade (défaut), slide, slide-scale
- ✅ Indicateur de floor courant
- ✅ Effet de butée (bounce) aux extrémités

**Overlays** :
- ✅ Multi-overlays (transverses aux floors)
- ✅ Type `icon` (MDI, état coloré)
- ✅ Type `text` (valeur entité)
- ✅ Tous les tap_actions HA standards
- ✅ Couleurs HA standards + CSS variables overridables
- ✅ Boutons UI internes pour toggle overlays
- ✅ État local non persisté

**Plomberie** :
- ✅ TypeScript strict + Lit 3 + Rollup
- ✅ Workflow dev `HA_LOCAL_DIR` via Samba (convention HACS standard)
- ✅ Repo GitHub public, MIT
- ✅ GitHub Actions de build + release
- ✅ README + exemple minimal

### v0.2.0 — Confort utilisateur

- Tooltip au survol des éléments
- Type `badge` (icône + valeur combinées)
- Binding overlays à des entités HA (`visible_entity`)
- Persistance état overlays (localStorage)
- Animations CSS optionnelles (pulse pour présence, glow pour alerte)
- Transitions additionnelles (fade-up, zoom, etc. selon retour utilisateur)

### v0.3.0 — Maturité & publication HACS

- Type `zone` (formes SVG colorables, exige SVG externe)
- Éditeur visuel Lovelace UI (`getConfigElement` + `getStubConfig`)
- Mode "loop" optionnel pour la navigation
- Tests automatisés Vitest
- Internationalisation (EN/FR)
- **Soumission HACS officielle**

### v0.4.0+ — Avancé

- Auto-détection des Areas HA pour suggestions de mapping
- Heatmaps animées (température sur la maison)
- Mode 3D perspective (étages empilés inclinés)
- Support multi-bâtiments

### Hors scope durable

- WYSIWYG drag-and-drop des éléments → c'est un éditeur de config, pas le rôle d'une card
- Pack d'icônes meublées prédéfinies → trop dépendant des préférences

---

## 8. Premières étapes pour Claude Code

Voici les étapes ordonnées à passer à Claude Code, dans l'ordre. Chaque étape produit un livrable testable avant de passer à la suivante.

### Étape 0 — Bootstrap du projet

> "Crée la structure de repo `lovelace-floor-navigator` selon la section 5.4 de SPEC.md. Init avec `package.json`, `tsconfig.json`, `rollup.config.js` (avec lecture de `HA_LOCAL_DIR` via dotenv comme spécifié en 5.3), `.gitignore` (incluant `node_modules/`, `dist/`, `.env.local`), `.env.local.example` avec un commentaire d'exemple, `LICENSE` (MIT), `hacs.json`, `README.md` minimal. Génère un `dev/index.html` vide pour l'instant. Ne code aucun composant Lit encore."

**Livrable** : un repo qui peut faire `npm install`, `npm run build` (qui produira un bundle vide mais valide), et `npm run watch` (qui watche pour rien).

### Étape 1 — Composant racine + types

> "Implémente `src/types/config.ts` avec toutes les interfaces TypeScript dérivées de la section 3 de SPEC.md (CardConfig, Floor, Overlay, Element, etc.). Implémente `src/floor-navigator-card.ts` comme un LitElement minimal qui :
> - Enregistre le custom element `floor-navigator-card`
> - Implémente `setConfig(config)` qui valide et stocke la config
> - Render juste un `<div>` qui affiche `JSON.stringify(this.config)` pour vérifier
> - Expose `getCardSize()` qui retourne 8
>
> Pas encore de SVG, pas encore de logique. On valide juste que la card se charge dans HA."

**Livrable** : tu peux ajouter la card dans Lovelace et voir ta config affichée en JSON brut.

### Étape 2 — Rendu statique d'un floor

> "Implémente `src/components/fn-floor.ts` comme un LitElement qui rend un `<svg>` avec :
> - L'attribut `viewBox` venant de la prop
> - Une `<image href={background}>` couvrant tout le viewBox
> - Pour l'instant, ignore les overlays
>
> Modifie `floor-navigator-card.ts` pour rendre le PREMIER floor de la config via `<fn-floor>`. Les autres floors sont ignorés.
>
> Pas encore de navigation."

**Livrable** : tu vois ton plan L0 affiché dans la card.

### Étape 3 — Empilement des floors et navigation

> "Implémente la stratégie 3 (hybride) de la section 4.3 :
> - `fn-floor-stack` rend tous les floors côte à côte en CSS
> - `fn-navigation-controller` gère :
>   - L'état du floor courant (`@state() currentFloorIndex: number`)
>   - Le listener wheel (avec throttle 400ms)
>   - Les listeners touch pour swipe vertical
>   - Le `edge_behavior: bounce` (animation CSS sur extrémités)
> - Implémente la transition `crossfade` uniquement pour l'instant
>
> Mets à jour `dev/index.html` pour tester avec 3 floors fictifs (3 PNG dans `dev/test-floors/`)."

**Livrable** : tu peux naviguer entre les 3 plans à la molette et au swipe, avec rebond aux extrémités.

### Étape 4 — Indicateur de floor + transitions additionnelles

> "Implémente `fn-floor-indicator` qui affiche le `name` du floor courant en overlay (en bas-droite, style discret).
>
> Ajoute les transitions `slide` et `slide-scale` dans `fn-navigation-controller`. Le choix de transition vient de `settings.transition`.
>
> Implémente le système de CSS variables de la section 3.4 dans `src/styles/card-styles.ts`."

**Livrable** : la navigation est polie, l'indicateur s'affiche, les 3 transitions sont disponibles.

### Étape 5 — Overlays statiques (icon)

> "Implémente :
> - `fn-overlay-layer` qui rend un `<g>` contenant tous les elements d'un overlay sur un floor donné
> - `fn-element-icon` qui rend une icône MDI à `position` avec couleur dérivée de l'état de l'entité
> - `src/utils/icon-resolver.ts` qui retourne l'icône MDI par défaut selon le domaine de l'entité
> - `src/utils/color-resolver.ts` qui retourne la CSS variable de couleur selon domaine + état
>
> Mets à jour `fn-floor` pour rendre les `<fn-overlay-layer>` correspondant à ce floor.
>
> Mets à jour le mock HASS dans `dev/` pour avoir 5 entités lights avec états variés."

**Livrable** : tu vois des icônes lampes apparaître à leurs positions, avec les bonnes couleurs selon leur état.

### Étape 6 — Tap actions

> "Implémente le tap_action en utilisant `custom-card-helpers` (`handleAction` + `hasAction`). Toutes les actions HA standards doivent fonctionner via cette lib.
>
> Le tap sur un `fn-element-icon` doit déclencher l'action configurée.
>
> Test : dans le mock, le `toggle` doit basculer l'état de l'entité mockée."

**Livrable** : cliquer sur une icône lampe la toggle. Les autres actions fonctionnent aussi.

### Étape 7 — Type `text` + boutons d'overlay

> "Implémente `fn-element-text` qui rend un `<text>` SVG avec :
> - Valeur de `entity.state`
> - Suffixe `unit` (ou `unit_of_measurement` de l'entité par défaut)
> - Précision selon `precision`
> - Police selon CSS variables
>
> Implémente `fn-overlay-buttons` qui rend une barre de boutons pour toggle la visibilité de chaque overlay.
>
> L'état `visibleOverlays` vit dans `floor-navigator-card` et est passé en prop down."

**Livrable** : v0.1.0 fonctionnellement complète. Tu peux toggler les overlays, voir des températures, cliquer sur des lampes, naviguer entre étages.

### Étape 8 — Polish + release v0.1.0

> "
> - Configure GitHub Actions (`build.yml` et `release.yml`)
> - Ajoute des screenshots dans `docs/screenshots/`
> - Étoffe le `README.md` avec section installation (manuelle + via custom repo HACS), config minimale, exemple complet
> - Ajoute 3 exemples dans `docs/examples/`
> - Tag git `v0.1.0`, vérifie que la release auto fonctionne
> "

**Livrable** : v0.1.0 release sur GitHub, prête à installer manuellement ou via custom repo HACS (sans publication officielle HACS encore).

---

## 9. Annexes

### 9.1 Conventions de code

- **Indentation** : 2 espaces (standard TypeScript moderne)
- **Quotes** : single quotes pour TS, double quotes pour HTML/JSX
- **Semicolons** : oui (standard Lit/HA)
- **Imports** : trier alphabétiquement, séparer node_modules / locaux par une ligne vide
- **Naming** :
  - Classes : PascalCase (`FloorNavigatorCard`)
  - Methods/variables : camelCase (`currentFloorIndex`)
  - Custom elements : kebab-case avec préfixe `fn-` (`<fn-floor>`)
  - CSS variables : kebab-case avec préfixe `--fn-` (`--fn-color-on`)
  - YAML config keys : snake_case (`default_visible`, `tap_action`)

### 9.2 Versionnage SemVer

- **Patch** (0.1.0 → 0.1.1) : bug fixes, pas de changement d'API
- **Minor** (0.1.0 → 0.2.0) : nouvelles features backward-compatible
- **Major** (0.x → 1.0) : breaking changes API. **À éviter avant publication HACS**.

### 9.3 Définition de "done" pour la v0.1.0

La v0.1.0 est considérée livrée quand TOUTES ces conditions sont vraies :

- [ ] Toutes les fonctionnalités listées en section 7 v0.1.0 sont implémentées
- [ ] La card fonctionne sur le HA réel de Johann avec ses 3 plans (L0, L1, L2)
- [ ] Au minimum 5 entités lights, 5 sensors temp, 2-3 binary_sensors présence sont mappés
- [ ] Test manuel sur Pixel 9 Pro XL : navigation swipe fluide, taps qui marchent
- [ ] Test manuel sur poste Fatboy : navigation molette fluide
- [ ] README compréhensible par un non-Johann
- [ ] Bundle JS final < 50 KB (gzipped < 20 KB)
- [ ] Aucune erreur dans la console HA au chargement de la card

### 9.4 Liens utiles

- Documentation Lit : https://lit.dev
- Custom Cards in HA : https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- HACS publishing guide : https://hacs.xyz/docs/publish/start
- custom-card-helpers : https://github.com/custom-cards/custom-card-helpers
- Exemple de card de référence (Mushroom) : https://github.com/piitaya/lovelace-mushroom
- Exemple de workflow `HA_LOCAL_DIR` : https://github.com/punxaphil/custom-sonos-card
- Exemple `TARGET_DIRECTORY` : https://github.com/brunosabot/streamline-card

### 9.5 Cache busting automatique (idée pour v0.2.0+)

Pour éviter le `Ctrl+Shift+R` manuel, le pattern `hacstag` employé par custom-sonos-card consiste à embarquer dans le bundle un commentaire avec le timestamp ou le hash git, et à exposer une `console.info("FloorNavigator vX.Y.Z [hash]")` au chargement. Une GitHub Action de release peut aussi auto-incrémenter une query string par défaut dans la doc d'install.

À considérer si le workflow `Ctrl+Shift+R` devient lourd. Pas dans le scope v0.1.0.

### 9.6 Notes spécifiques à l'environnement Johann

Hors-spec mais utile pour le bootstrap :

- HAOS de Johann est en `192.168.1.61`. Le partage Samba sera donc `\\192.168.1.61\config\`.
- Le poste de dev principal est "Fatboy" (Bureau L2). Le mapping `Z:` sera défini là-dessus.
- Le repo HA principal `JohannBlais/homeassistant-config` est privé et utilise un Git Pull add-on. Le repo `lovelace-floor-navigator` sera distinct, public ou privé au choix selon la stratégie de publication choisie (publish polished → privé d'abord puis ouvert à v0.3.0).

---

**Fin de la spec v0.1.0.**

Toute modification de ce document après bootstrap doit être traitée comme un changement d'API : justifiée, datée, et documentée dans le changelog du repo.
