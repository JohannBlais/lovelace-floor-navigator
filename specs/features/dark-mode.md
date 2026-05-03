---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [data-model.md, color-scheme.md, ../architecture/component-tree.md, ../architecture/rendering-strategy.md]
---

# Dark Mode

Support optionnel d'images de fond alternatives en mode sombre. Spec
draft pour la **v0.1.1**, feature isolée et compat backward complète.

## Contexte

La v0.1.0 affiche une image de fond unique par floor (champ `background`).
Cette image est typiquement un plan exporté de Sweet Home 3D ou
équivalent, conçu en couleurs claires pour bonne lisibilité.

Quand l'utilisateur active le dark mode HA (manuellement ou via
auto-détection horaire), le reste de l'interface Lovelace bascule en
sombre, mais la card reste en plan clair — incohérence visuelle qui
agresse l'œil le soir.

L'utilisateur veut pouvoir fournir une **version sombre** de chaque plan
(typiquement un export inversé ou re-stylé) et que la card bascule
automatiquement entre les deux selon le contexte HA.

Cette feature est **isolée** : elle n'affecte ni la navigation, ni les
overlays, ni les couleurs des éléments. Uniquement l'image de fond.

## Objectifs

1. Permettre une déclaration optionnelle d'une image dark par floor
2. Bascule automatique en suivant le thème HA (avec override manuel
   possible)
3. Crossfade fluide entre les deux images, sans flash ni latence
4. Compat backward complète : toute config v0.1.0 fonctionne sans
   modification
5. Si dark variant absent pour un floor, comportement gracieux (fallback
   sur image par défaut + warning console une fois)

## Scope

### In

- Nouveau setting global `dark_mode: auto | on | off` (défaut `auto`)
- Nouveau champ `backgrounds: { default, dark }` au niveau floor (forme
  étendue)
- Compat backward avec champ `background` v0.1.0 (forme courte)
- Cascade de détection : setting > `hass.themes.darkMode` > `prefers-color-scheme`
- Rendu DOM avec 2 `<image>` superposés et crossfade CSS ~200ms
- Optimisation : pas de DOM dark si `dark_mode: off`
- Warning console une fois par floor sans dark variant en mode dark
- Mise à jour de `dev/mock-hass.ts` pour exposer un toggle dark mode
- Nouvel exemple `docs/examples/dark-mode.yaml`

### Out

- Couleurs des éléments en dark mode (cf.
  [`color-scheme.md`](color-scheme.md) — les CSS variables restent
  identiques, le thème HA gère la cohérence des couleurs)
- Modes additionnels au-delà de light/dark (high-contrast, sepia,
  ambient...) — réservés pour futures clés dans `backgrounds.<mode>`,
  pas implémentés en v0.1.1
- Auto-génération d'image dark à partir de l'image light (filtres CSS
  d'inversion) — ce serait moins lisible qu'une image dédiée
- Pinch-zoom sur les plans (rapport orthogonal au dark mode)

## Comportement attendu

### Source de la décision (cascade)

Le mode courant (`'light' | 'dark'`) est résolu via cette cascade, dans
l'ordre :

1. **Setting `settings.dark_mode`** (priorité maximale)
   - `on` → force le dark mode quel que soit le contexte HA/browser
   - `off` → force le light mode quel que soit le contexte HA/browser
   - `auto` (défaut) → délégué aux sources ci-dessous

2. **HA `hass.themes.darkMode`** (en mode auto)
   - Signal officiel HA, suit le thème courant et le mode auto basé sur
     l'heure si configuré côté thème HA

3. **Browser `window.matchMedia('(prefers-color-scheme: dark)')`** (fallback)
   - Si `hass.themes.darkMode` est indisponible (HA pas encore chargé,
     mode standalone, etc.)

### Champ `backgrounds` (forme étendue)

Nouveau champ optionnel au niveau floor :

```yaml
floors:
  - id: L0
    name: "Rez-de-chaussée"
    backgrounds:
      default: /local/floorplans/L0-day.png
      dark: /local/floorplans/L0-night.png
```

| Clé | Type | Obligatoire | Description |
|---|---|---|---|
| `default` | string | ✅ | Path image utilisée en mode `light` (et fallback) |
| `dark` | string | ❌ | Path image utilisée en mode `dark` |
| `<autres>` | string | ❌ | Réservé pour futurs modes (high-contrast, sepia...). Ignoré en v0.1.1. |

### Compat backward avec `background` (forme courte)

Le champ `background` v0.1.0 reste fonctionnel :

```yaml
floors:
  - id: L0
    name: "Rez-de-chaussée"
    background: /local/floorplans/L0.png  # forme courte v0.1.0
```

Règles de validation runtime :

- Au moins **un** des deux champs `background` ou `backgrounds` doit
  être présent. Sinon throw `Floor X requires either 'background' or 'backgrounds.default'`.
- Si `backgrounds` est présent, il **doit** contenir une clé `default`.
  Sinon throw `Floor X has 'backgrounds' but no 'backgrounds.default'`.
- Si les deux sont présents : `backgrounds` prend la priorité,
  `background` est ignoré **silencieusement** (situation transitoire de
  migration acceptable, pas de warning).

### Algorithme de résolution du path d'image

Pour un floor donné et un mode courant `'light' | 'dark'` :

```
SI floor.backgrounds est défini :
  SI mode === 'light' :
    → backgrounds.default
  SI mode === 'dark' :
    SI backgrounds.dark présent :
      → backgrounds.dark
    SINON :
      → backgrounds.default + console.warn() (une fois)
SINON (forme courte uniquement) :
  SI mode === 'light' :
    → background
  SI mode === 'dark' :
    → background + console.warn() (une fois, "no dark variant")
```

### Rendu DOM et crossfade

Pour chaque floor, le composant émet **2 `<image>` superposés** dans le
SVG quand un dark variant existe (forme étendue avec `backgrounds.dark`)
**ET** quand `settings.dark_mode !== 'off'` :

```html
<g id="fn-floor-L0">
  <image id="fn-floor-L0-bg-default" href="L0-day.png" class="fn-bg-default" />
  <image id="fn-floor-L0-bg-dark"    href="L0-night.png" class="fn-bg-dark" />
  <!-- overlays par-dessus -->
</g>
```

Si un floor n'a **pas** de dark variant (forme courte ou `backgrounds`
sans `dark`), seul le `<image>` default est émis.

Si `settings.dark_mode === 'off'`, le composant n'émet PAS les `<image>`
dark même quand `backgrounds.dark` est déclaré dans la config. Pas de
DOM inutile pour un mode désactivé explicitement.

Une classe globale sur le composant racine (`fn-theme-light` ou
`fn-theme-dark`) détermine quelle image est visible :

```css
.fn-bg-default, .fn-bg-dark {
  transition: opacity 200ms ease-in-out;
}
.fn-theme-light .fn-bg-default { opacity: 1; }
.fn-theme-light .fn-bg-dark    { opacity: 0; }
.fn-theme-dark  .fn-bg-default { opacity: 0; }
.fn-theme-dark  .fn-bg-dark    { opacity: 1; }
```

Les 2 images restent dans le DOM en permanence, le toggle est purement
opacité → crossfade fluide, pas de re-fetch network au switch.

### Souscription aux changements de thème

Le composant racine `floor-navigator-card` :

- Maintient une `@state() currentTheme: 'light' | 'dark'`
- Recalcule `currentTheme` via `theme-resolver` à chaque update du
  `hass` (réactif via Lit)
- Souscrit dans `connectedCallback` à
  `window.matchMedia('(prefers-color-scheme: dark)')` via
  `addEventListener('change', ...)`
- Cleanup obligatoire dans `disconnectedCallback` pour éviter des fuites
  mémoire en navigation Lovelace

L'événement de changement de `hass.themes.darkMode` ne nécessite **pas**
d'EventTarget custom : la prop `hass` étant reactive, Lit re-render
automatiquement quand HA push une nouvelle valeur.

### Préchargement et performance

Les 2 images étant chargées dès le montage initial (les 2 `<image>` sont
dans le DOM avec leurs `href`), le toggle est instantané sans latence
réseau. Le coût mémoire est doublé sur les floors qui ont les 2
variantes — acceptable étant donné qu'un floor plan PNG fait typiquement
100-500 KB.

## Cas limites

### Floor sans dark variant en mode dark

L'utilisateur a déclaré `backgrounds: { default: ... }` sans `dark`, et
le mode courant est dark. Comportement :
- Image par défaut affichée
- `console.warn('[floor-navigator-card] Floor "L1" has no dark variant. Falling back to default image in dark mode.')` émis **une seule fois** par instance de floor (flag `_hasWarned: boolean` sur `<fn-floor>`)
- Pas de placeholder rouge ou autre signal visuel

### Mix de floors avec et sans dark variant

L'utilisateur a 3 floors : L0 et L2 ont `backgrounds.dark`, L1 n'en a
pas. Comportement en mode dark :
- L0 et L2 : image dark
- L1 : image light + warning console une fois
- Visuellement incohérent, mais l'utilisateur a été averti et peut
  fournir le dark variant manquant à son rythme

### Toggle de thème HA pendant une transition de floor

L'utilisateur navigue entre floors et change de thème HA en même temps.
Comportement : le crossfade light/dark se superpose au mouvement de
transition de floor. Visuellement OK car les transitions ciblent des
propriétés différentes (opacity pour theme switch, transform pour
navigation).

### Setting `dark_mode: on` mais aucun floor n'a `dark`

L'utilisateur force `dark_mode: on` mais tous les floors sont en forme
courte (`background` uniquement). Comportement : warning console émis
pour chaque floor (au connectedCallback de chacun, une fois par
instance), images light affichées partout. Cohérent avec le
comportement "fallback gracieux".

### `backgrounds.dark` en chemin invalide (404)

L'utilisateur déclare `backgrounds.dark: /local/missing.png`.
Comportement : le browser charge l'image, le 404 produit une image
cassée (broken image icon). Pas de gestion explicite côté composant.
Le DevTools network montre le 404 — l'utilisateur diagnostique facilement.

### Cache du browser sur image dark modifiée

L'utilisateur modifie son image dark côté HAOS pendant le développement.
Le browser sert la version cachée. Solutions :
- `Ctrl+Shift+R` pour bypass cache
- Ajouter un query string différent (`?v=2`) au path dans la config

Documenté dans
[`../architecture/dev-workflow.md`](../architecture/dev-workflow.md).

### Plusieurs instances de la card sur le même dashboard

L'utilisateur a 2 cards `floor-navigator-card` sur le même dashboard
(use case rare mais possible). Chaque instance souscrit indépendamment
à `matchMedia` et reçoit son propre `hass`. Pas de partage d'état entre
instances. Pas de problème particulier.

### Mode standalone (sans HA, dev rapide)

En mode dev rapide (`dev/index.html`), `hass` est mocké. Le mock doit
exposer `themes.darkMode` togglable pour permettre le test du dark
mode sans HA réel. Sinon le fallback `prefers-color-scheme` du browser
prend le relais.

## Questions ouvertes

Aucune. Les 4 décisions structurantes (setting global vs per-floor,
naming `backgrounds`, transition crossfade, fallback warning) ont été
tranchées en session de design Claude Opus.

## Décisions

### Décisions tranchées (2026-05-03, session Claude Opus)

- **Granularité** : setting global `dark_mode` + déclaration optionnelle
  par floor. Cohérence visuelle pilotée globalement, déclaration locale
  pour le contenu. Permet à l'utilisateur de désactiver explicitement
  même s'il a fourni des dark variants.

- **Override config** : valeurs `auto | on | off` (3 valeurs claires)
  plutôt qu'un boolean ou un enum plus riche. Couvre tous les cas
  d'usage sans complexité.

- **Naming `backgrounds.{default, dark}`** : forme étendue extensible
  pour modes futurs (high-contrast, sepia...) sans casser l'API.
  `default` plutôt que `light` parce que c'est le fallback universel,
  pas seulement l'image en mode light.

- **Compat backward `background` (court) + `backgrounds` (étendu)** :
  les deux formes supportées simultanément, `backgrounds` prioritaire
  si les deux présents. Permet aux configs v0.1.0 de fonctionner
  inchangées et de migrer progressivement.

- **Crossfade simple ~200ms** sur opacity, plutôt que réutiliser le
  système de transitions de navigation (slide, slide-scale). Le toggle
  light/dark est sémantiquement différent d'un mouvement spatial — c'est
  un changement d'apparence, pas de niveau.

- **Fallback silencieux + warning console** plutôt que "all or nothing"
  (désactivation globale du dark mode si un floor manque). L'utilisateur
  prend ses responsabilités, le warning aide à diagnostiquer.

- **Cible release v0.1.1 isolée** plutôt que v0.2.0 groupée. Feature
  autonome, bien isolée techniquement. Justifie un patch SemVer (compat
  backward complète). Voir
  [`../architecture/conventions.md`](../architecture/conventions.md)
  pour la justification SemVer.

### Décisions reportées

- **Modes additionnels** (high-contrast, sepia, ambient...) : structure
  `backgrounds.<mode>` prête à les accueillir, mais aucun n'est
  implémenté en v0.1.1. À considérer en v0.4.0+ selon demandes.

- **Couleurs d'éléments en dark mode** : pas dans le scope. Les CSS
  variables restent identiques light/dark. Si l'utilisateur veut des
  couleurs différentes, il peut les définir dans un thème HA dark.

## Implémentation — sera détaillée par Claude Code

Cette spec est `draft` jusqu'à validation post-implémentation. Claude
Code doit, en suivant cette spec :

1. Créer `src/utils/theme-resolver.ts` — résolution du mode courant
2. Créer `src/utils/background-resolver.ts` — résolution du path d'image
3. Étendre `src/types/config.ts` — types `Backgrounds`, `dark_mode`
4. Modifier `src/components/fn-floor.ts` — émettre 2 `<image>` selon
   contexte
5. Modifier `src/floor-navigator-card.ts` — `currentTheme` reactive +
   souscription matchMedia + classe `fn-theme-*`
6. Étendre `src/styles/card-styles.ts` — règles CSS de crossfade
7. Mettre à jour `dev/mock-hass.ts` — toggle `themes.darkMode`
8. Créer `docs/examples/dark-mode.yaml` — exemple complet
9. Bump `CARD_VERSION` à `0.1.1` dans `floor-navigator-card.ts`
10. Mettre à jour `README.md` du repo — section configuration

Une fois implémentée et validée :

- Statut de cette spec passe à `implemented`
- Les nouveaux champs (`backgrounds`, `dark_mode`) sont mergés dans
  [`data-model.md`](data-model.md)
- Un ADR-005 est ajouté dans
  [`../decisions.md`](../decisions.md) consignant les choix structurants
- Un nouvel item dans le changelog du
  [`../README.md`](../README.md) sous v0.1.1
