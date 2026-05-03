# Backlog

Living list of improvements, ideas, and known issues for Floor Navigator.

Distinct from [`docs/SPEC.md`](docs/SPEC.md) — the spec is the frozen design
baseline (v0.1.0 API contract). Items here are **candidates**, not
commitments. Reorganize, promote to spec, or drop as priorities evolve.

## Conventions

| Tag | Meaning |
|-----|---------|
| 🐛 | Known bug or quality issue |
| ✨ | New feature, likely v0.2.x candidate |
| ⚡ | Perf or bundle-size improvement |
| 🛠 | Tooling, CI, dev workflow |
| 🔮 | Speculative / future / maybe |

When picking up an item, drop a checkmark next to it (`✅`) and link the
PR / commit. Move done items to a "Released" section under the version
that shipped them.

---

## 🐛 Bugs / quality

- **CRLF / LF warnings on every commit** sur Windows.
  Le repo n'a pas de `.gitattributes` ; Git détecte les écritures en CRLF
  sur les fichiers que git stocke en LF et émet un warning `LF will be
  replaced by CRLF`. Bénin mais bruyant. Fix : ajouter `.gitattributes`
  avec `* text=auto eol=lf` + override pour les `.bat`/`.cmd`.

- **Swipe démarrant sur un bouton d'overlay → navigation au lieu de toggle.**
  Si l'utilisateur commence un swipe (>50px) le doigt posé sur un bouton
  de la barre d'overlay, le browser ne synthétise pas de click → le bouton
  n'est pas toggle, le controller navigue. Cohérent avec la sémantique
  "swipe = navigate", mais peut surprendre. Fix candidat : ignorer le
  tracking de swipe dans `_onTouchStart` quand `e.target` est dans
  `<fn-overlay-buttons>` (filtre sur `closest()`).

- **Taille par défaut des icônes/text codée en dur (48 / 24 viewBox units).**
  Adaptée à un viewBox 1920×1080. Pour des viewBox très différents
  (ex. `0 0 200 100`) les défauts donnent des éléments énormes. Fix
  candidat : défaut relatif au viewBox (ex. `viewBoxWidth / 40`).

- **Bounce + slide-scale : pendant le bounce, le scale est temporairement
  perdu.** Le keyframe d'animation override le `transform` complet, donc
  le `scale(1)` du floor actif disparaît pendant les 150ms du rebond.
  Visuel mineur. Fix : injecter le scale dans les keyframes selon le
  mode de transition (ou utiliser deux propriétés CSS séparées).

---

## ✨ v0.2.x candidates

Items déjà listés dans SPEC §7 v0.2.0 (rappel) :
- Tooltip au survol des éléments
- Type `badge` (icon + valeur combinés)
- Binding overlays à des entités HA (`visible_entity`)
- Persistance état overlays (localStorage)
- Animations CSS optionnelles (pulse pour présence, glow pour alerte)
- Transitions additionnelles (fade-up, zoom, …)

Capturés pendant le dev :

- **`hold_action` + `double_tap_action`.**
  `handleAction` de custom-card-helpers les supporte déjà ; il suffit
  d'ajouter `hold_action` et `double_tap_action` dans `IconElement` (et
  les types associés), de wirer `handleClick` from custom-card-helpers
  qui gère la discrimination tap/hold/dblclick.

- **Cache busting automatique** (cf. SPEC annexe 9.5).
  Embarquer le hash git dans le bundle au build, exposer via
  `console.info` au chargement, optionnellement query-string auto dans
  la doc d'install. Évite le `Ctrl+Shift+R` manuel après chaque release.

- **Keyboard navigation.**
  `PageUp` / `PageDown` (ou `↑` / `↓`) pour naviguer entre floors quand
  la card a le focus. Accessibilité.

- **Plusieurs icônes pour la même entité dans des overlays différents.**
  Use case : `light.salon` dans l'overlay "Lights" ET dans l'overlay
  "Énergie" avec couleur différente. Marche déjà en théorie (rien ne
  l'empêche), mais à valider et documenter.

- **Format de durée intelligent pour les timestamps.**
  Pour les sensors de type `last_changed` ou `_timestamp`, afficher
  "il y a 5 min" plutôt que la valeur brute. Détection via
  `device_class: timestamp` ou `unit_of_measurement === 'min'`.

- **Dark mode**
  Ajout de la gestion du dark mode avec possibilité de définir 
  des version "dark" des images de chaque floor.

---

## ⚡ Perf / bundle

- **Vendor les helpers de custom-card-helpers qu'on utilise réellement.**
  Actuellement on importe `handleAction` qui pull `toggle-entity`,
  `fire-event`, `navigate`, `forwardHaptic`, et leak `@formatjs/intl-utils`
  via la barrel d'imports. Total ≈ 3-4 KB minifié pour ~150 lignes de
  logique réelle. Réimplémenter les 5-6 helpers locaux ferait gagner
  ~3 KB et virerait le warning Rollup `"this" has been rewritten to
  "undefined"` sur `@formatjs`.

- **Per-element reactivity pour `fn-element-text`.**
  Actuellement le whole layer re-render quand n'importe quelle entité
  change. Trivial pour ~20 text elements ; à reconsidérer si profilage
  montre du jank avec ~100+ overlays text actifs simultanément.
  Solution : transformer le helper en LitElement (dans foreignObject
  ou via un `<g>` natif avec un trick).

- **Lazy-load des transitions slide / slide-scale.**
  Le CSS pour les 3 transitions est compilé dans le bundle ; on
  pourrait split en CSS modules conditionnels selon `settings.transition`.
  Gain marginal (~0.5 KB).

---

## 🛠 Tooling / chore

- **`.gitattributes` pour normaliser les eol.** Cf. bug CRLF/LF plus haut.

- **Pre-commit hook avec lint + build size check.**
  Détecte les régressions avant push. Husky + lint-staged.

- **Tests Vitest (déjà dans la roadmap v0.3.0).**
  Au minimum : tests unitaires pour `color-resolver`, `icon-resolver`,
  parsing de `tap_action` (string vs object), validation de config.

- **Screenshots dans `docs/screenshots/`.**
  Le placeholder est en place ; reste à produire `hero.png`,
  `transitions.gif`, `overlay-toggle.gif`. Hors-scope dev pur,
  c'est au owner du repo.

- **Live reload en dev mode.**
  Actuellement il faut `Ctrl+R` après chaque rebuild. Un petit
  watcher WebSocket dans `dev/index.html` éliminerait ça.

- **Dependabot grouping** dans `.github/dependabot.yml` : grouper les
  bumps de minor/patch de devDependencies ensemble pour éviter le
  bruit de 5 PRs séparées par semaine.

---

## 🔮 Speculative / longer term

- **Pinch-zoom sur le plan.**
  Actuellement bloqué par `touch-action: none` sur le controller. Pour
  des plans très détaillés, le zoom serait utile. Implique un nouveau
  state (zoom level + pan offset) et de réconcilier avec le système
  de viewBox.

- **Drag-and-drop pour positionner les éléments.**
  En mode édition uniquement (gated par un toggle). Synchronisation
  avec le YAML config. Spec marque "hors scope durable" l'éditeur
  WYSIWYG full, mais un mode "click pour placer" plus modeste pourrait
  être très utile.

- **Mode 3D perspective.**
  Cf. SPEC §7 v0.4.0+. Étages empilés inclinés type "isométrique"
  pour un effet maquette.

- **Heatmaps animées.**
  Température continue rendue comme un dégradé sur la maison plutôt
  que des valeurs ponctuelles.

- **Auto-suggestions via les Areas HA.**
  Quand un overlay référence des entités HA, proposer leurs Areas
  comme floors candidats.

- **Multi-bâtiments.**
  Une "card" pour la maison principale, une autre pour le garage.
  Avec navigation horizontale entre bâtiments + verticale entre floors.

---

## Référence

Roadmap haute-niveau : voir [`docs/SPEC.md` §7](docs/SPEC.md#7-roadmap).
