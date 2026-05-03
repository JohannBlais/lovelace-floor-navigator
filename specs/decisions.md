---
status: validated
owner: Johann Blais
last_updated: 2026-05-04
related: []
---

# Decisions — ADRs chronologiques

Ce fichier consigne les décisions structurantes du projet sous forme d'ADRs
(Architecture Decision Records) datés. Chaque entrée capture le contexte,
l'option retenue, et les alternatives écartées.

Les décisions purement éditoriales (renommer une variable, déplacer un
fichier) n'ont pas leur place ici. Les décisions techniques avec impact
durable (choix de stack, naming d'API, conventions) sont consignées.

## Format

```markdown
## [YYYY-MM-DD] ADR-NNN — Titre court

**Contexte** : pourquoi la question s'est posée.

**Décision** : ce qui a été retenu.

**Alternatives écartées** : ce qui a été considéré et rejeté, avec raisons.

**Conséquences** : impacts pratiques, dette éventuelle, points de vigilance.

**Statut** : accepted | superseded by ADR-MMM | deprecated
```

---

## [2026-05-01] ADR-001 — Custom element tag suffixé en `-card`

**Contexte** : lors du bootstrap, première tentative avec
`type: custom:floor-navigator` dans le YAML. HA retourne l'erreur
"Custom element doesn't exist". HA résout `custom:<X>` en cherchant un
custom element nommé exactement `<X>`. Notre tag étant
`floor-navigator-card`, le YAML doit matcher.

**Décision** : custom element tag = `floor-navigator-card`, type YAML =
`custom:floor-navigator-card`. Convention HACS standard
(`mushroom-light-card`, `mini-graph-card`, `button-card`, `bubble-card`).

**Alternatives écartées** :
- `floor-navigator` court et type `custom:floor-navigator` → cassé,
  pas conforme à la convention HACS

**Conséquences** : tous les exemples YAML doivent référencer
`custom:floor-navigator-card`. Spec
[`architecture/identity.md`](architecture/identity.md) consigne ce nom comme
identité figée du composant.

**Statut** : accepted

---

## [2026-05-01] ADR-002 — Chargement explicite de `.env.local` côté Rollup

**Contexte** : config Rollup utilisait `import 'dotenv/config'` qui ne
chargeait pas les variables de `.env.local` malgré ce qu'on attendait.
Investigation : la convention `.env.local` qui override `.env` est
spécifique à Vite/Next.js, pas à dotenv vanilla. Le raccourci charge `.env`
par défaut, point.

**Décision** : utiliser `dotenv.config({ path: '.env.local' })` explicite
en tête de `rollup.config.js`.

**Alternatives écartées** :
- Garder `import 'dotenv/config'` et créer un `.env` au lieu de `.env.local`
  → moins propre car `.env` est conventionnellement engagé dans le repo
  pour les valeurs publiques tandis que `.env.local` est gitignored pour
  les valeurs locales

**Conséquences** : pattern documenté dans
[`architecture/tech-stack.md`](architecture/tech-stack.md) §config Rollup.

**Statut** : accepted

---

## [2026-05-03] ADR-003 — Définition de "done" pour la v0.1.0

**Contexte** : avant de tagger v0.1.0, il fallait des critères objectifs de
release pour ne pas livrer prématurément. Critères dérivés du périmètre
spec et des contraintes pratiques (mobile, perf bundle).

**Décision** : v0.1.0 livrée quand TOUTES ces conditions sont vraies :
- Toutes les fonctionnalités v0.1.0 listées dans la roadmap sont implémentées
- La card fonctionne sur le HA réel de Johann avec ses 3 plans (L0, L1, L2)
- Au minimum 5 entités lights, 5 sensors temp, 2-3 binary_sensors présence
  sont mappés
- Test manuel sur Pixel 9 Pro XL : navigation swipe fluide, taps qui
  marchent
- Test manuel sur poste Fatboy : navigation molette fluide
- README compréhensible par un non-Johann
- Bundle JS final < 50 KB (gzipped < 20 KB)
- Aucune erreur dans la console HA au chargement de la card

**Alternatives écartées** :
- Tester uniquement en mode dev local → insuffisant, des bugs de
  chargement HA n'apparaissent qu'en intégration réelle
- Cible bundle plus permissive → le risque de bloat est élevé sur des
  custom cards Lovelace, fixer 50 KB tôt force la discipline

**Conséquences** : critères atteints le 2026-05-03, tag v0.1.0 publié
avec bundle final 47 KB.

**Statut** : accepted (historique, pour mémoire)

---

## [2026-05-03] ADR-004 — Bootstrap de la structure `/specs/`

**Contexte** : la spec initiale tenait dans un mégadocument
`docs/SPEC.md` de ~1100 lignes mêlant identité, modèle de données,
architecture, stack, workflow, roadmap, étapes Claude Code. À l'approche
de la v0.1.1 (dark mode) et au-delà, le format ne scale pas : pas de
granularité statut par feature, pas de canal de remontée Claude Code,
mégadocument à recharger entièrement à chaque modif.

**Décision** : adopter la structure `/specs/` imposée par les règles du
projet (à la racine du repo, pas dans `docs/`). Fichiers transverses
(README, open-questions, decisions, glossary, conventions) +
sous-dossiers `architecture/` et `features/`. Frontmatter YAML obligatoire
sur chaque fichier. Une spec = un fichier.

**Alternatives écartées** :
- Garder `docs/SPEC.md` et l'étendre avec un changelog plus riche → ne
  résout pas le problème de granularité ni de remontée Claude Code
- Mettre `/specs/` dans `docs/specs/` → contre la convention du projet

**Conséquences** :
- `docs/SPEC.md` supprimé après migration intégrale du contenu
- BACKLOG.md à racine reste valide (irritants vivants, pas spec)
- Tous les futurs ajouts de feature passent par `specs/features/<slug>.md`

**Statut** : accepted

---

## [2026-05-04] ADR-005 — Dark mode pour les backgrounds de floor (v0.1.1)

**Contexte** : v0.1.0 affiche une image unique par floor. Quand l'utilisateur
active le dark mode HA (manuellement ou auto-détection horaire), le reste
de Lovelace bascule en sombre, mais la card reste en plan clair —
incohérence visuelle qui agresse l'œil le soir. Besoin d'un mécanisme
optionnel de variants dark, isolé du reste de la card (ne touche ni la
navigation ni les couleurs des éléments d'overlay).

**Décision** : implémentation v0.1.1 isolée et compat backward complète,
détaillée dans [`features/dark-mode.md`](features/dark-mode.md). Sept
choix structurants :

- **Granularité** : setting global `dark_mode` (`auto`/`on`/`off`) +
  champ optionnel `backgrounds` par floor. Cohérence visuelle pilotée
  globalement, déclaration des images localement.
- **Naming `backgrounds.{default, dark}`** étendu, avec signature index
  ouverte (`[key: string]: string`) pour modes futurs (high-contrast,
  sepia, ambient...) sans breaking change. `default` plutôt que `light`
  car c'est le fallback universel, pas seulement le mode light.
- **Compat backward `background` court + `backgrounds` étendu** : les
  deux formes coexistent. Si les deux sont posées sur le même floor,
  `backgrounds` gagne et `background` est ignoré silencieusement.
- **Cascade de détection** : `setting` (on/off priorité max) >
  `hass.themes.darkMode` > `prefers-color-scheme: dark` (browser
  fallback).
- **Crossfade simple ~200ms** sur opacity, distinct du système de
  transitions de navigation. Le toggle light/dark est un changement
  d'apparence, pas un mouvement spatial.
- **Fallback silencieux + warning console** une seule fois par floor
  sans dark variant. Pas de "all or nothing" qui désactiverait le dark
  mode global si un floor manque.
- **Release v0.1.1 patch** plutôt que v0.2.0 grouper : feature isolée
  techniquement + compat backward complète justifient le bump patch
  SemVer (cf. [`architecture/conventions.md`](architecture/conventions.md)).

**Alternatives écartées** :
- Auto-génération d'une image dark via `filter: invert(1)` CSS → moins
  lisible qu'une image dédiée, mauvais résultat sur photos colorées
- Setting boolean `dark_mode: true/false` → ne couvre pas le cas "auto
  basé sur HA", l'enum 3-valeurs est plus expressif
- Champ unique `background` polymorphe (string ou object) → ambiguïté
  dans le YAML, le 2-champ explicite est plus clair
- Bascule de couleurs des éléments en dark mode → reporté, hors scope
  v0.1.1 (les CSS variables de
  [`features/color-scheme.md`](features/color-scheme.md) restent
  identiques light/dark ; un thème HA dark peut les override)

**Conséquences** :
- Bundle 47.0 → 49.7 KiB (50877 bytes), marge 323 bytes sous le seuil
  50 KiB du build CI. Tight ; le BACKLOG mentionne le vendoring de
  `custom-card-helpers` (gain ~3 KiB) si plus de room est nécessaire
  en v0.2+.
- Index signature `Backgrounds[key: string]` ouvre le contrat YAML
  pour modes futurs sans breaking change.
- Les configs documentées en forme courte (v0.1.0) continueront de
  fonctionner indéfiniment (compat backward jusqu'à v1.0).
- Le toggle de classe `fn-theme-{light|dark}` est posé sur le `<svg>`
  de chaque `<fn-floor>` (et non sur la card racine) pour rester dans
  le shadow DOM où vivent les `<image>` ciblées par les règles CSS de
  `backgroundCrossfade`.

**Statut** : accepted

---

## Template pour les futures décisions

Copier-coller en tête de la liste, juste sous le séparateur principal.
Numéroter `ADR-NNN` en continuant la suite (la dernière en date est
`ADR-005`).
