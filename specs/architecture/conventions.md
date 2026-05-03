---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: []
---

# Conventions

Code style + versionnage + nommage. Spec figée — toute évolution passe par
une décision consignée dans [`../decisions.md`](../decisions.md).

## Contexte

Projet OS publiable sur HACS, mainteneur principal solo. Les conventions
visent la lisibilité long terme et l'alignement sur l'écosystème custom
cards Lovelace plutôt qu'un style purement personnel. Beaucoup de
contributeurs externes potentiels sont des développeurs ad hoc qui
arrivent depuis des cards similaires (Mushroom, Mini-Graph, Button-Card)
— moins ils ont à apprendre de spécifique, mieux c'est.

## Objectifs

1. Lisibilité immédiate pour quelqu'un qui connaît Lit + TypeScript
2. Cohérence avec l'écosystème custom cards HACS
3. Versionnage SemVer strict pour stabilité d'API jusqu'à v1.0
4. Nommage prédictible des éléments DOM/CSS (debug et card-mod faciles)

## Scope

### In

- Code style TypeScript / HTML / CSS
- Conventions de nommage (classes, variables, custom elements, CSS vars,
  YAML config keys)
- Versionnage SemVer

### Out

- Choix d'outillage de build (voir [`tech-stack.md`](tech-stack.md))
- Workflow git (voir [`dev-workflow.md`](dev-workflow.md))
- Tests automatisés (à définir en v0.3.0)

## Code style

| Aspect | Convention |
|---|---|
| Indentation | 2 espaces (standard TypeScript moderne) |
| Quotes | Single pour TS, double pour HTML/JSX |
| Semicolons | Oui (standard Lit/HA) |
| Imports | Tri alphabétique, séparation node_modules / locaux par ligne vide |

## Conventions de nommage

| Élément | Style | Exemple |
|---|---|---|
| Classes TS | PascalCase | `FloorNavigatorCard` |
| Methods/variables | camelCase | `currentFloorIndex` |
| Custom elements | kebab-case avec préfixe `fn-` | `<fn-floor>`, `<fn-element-icon>` |
| CSS variables | kebab-case avec préfixe `--fn-` | `--fn-color-on`, `--fn-text-shadow` |
| YAML config keys | snake_case | `default_visible`, `tap_action`, `dark_mode` |

Le préfixe `fn-` (Floor Navigator) sur les custom elements et CSS
variables évite les collisions avec d'autres composants Lovelace
cohabitant sur le même dashboard. Choix sciemment court (2 lettres) pour
ne pas alourdir les sélecteurs CSS et card-mod overrides.

## Versionnage SemVer

Application stricte de la spec [SemVer](https://semver.org/) :

| Bump | Critère | Exemple |
|---|---|---|
| Patch (0.1.0 → 0.1.1) | Bug fix OU nouvelle feature avec compat backward complète | Dark mode (feature isolée, compat backward) |
| Minor (0.1.0 → 0.2.0) | Nouvelles features substantielles backward-compatible | Tooltips + badges + persistance v0.2.0 |
| Major (0.x → 1.0) | Breaking changes API | À éviter avant publication HACS |

**Cas limite résolu en v0.1.1 (dark mode)** : techniquement c'est une
nouvelle feature (pas un bug fix), mais elle est isolée et compat
backward (champ `background` v0.1.0 toujours fonctionnel). Patch est
défendable car on ne veut pas inflater les minor versions trop tôt.
Décision prise pour ne pas multiplier les v0.x.0 avant la maturité
v0.3.0 / publication HACS.

## Comportement attendu

### Lecture immédiate

Un développeur Lit/TS qui ouvre n'importe quel fichier `src/` doit
comprendre l'intention sans consulter les conventions. C'est le
test : si le style force la lecture de ce fichier de conventions, c'est
trop éloigné de l'idiome courant.

### Card-mod et override

Toutes les CSS variables (`--fn-*`) doivent rester nommables sans
chercher : `--fn-color-light-on`, `--fn-color-switch-off`. Pas de
nommage cryptique. Le pattern `--fn-color-{domain}-{state}` doit être
prédictible pour permettre aux utilisateurs d'override leurs domaines
sans deviner.

### Migration majeur

Si un jour on doit faire un breaking change (bump major), un fichier
`MIGRATION.md` à la racine documente les changements. Pas avant la v1.0.

## Cas limites

- **Conflits ESLint/Prettier vs ces conventions** : la convention écrite
  ici prime. Si on ajoute un linter en v0.3.0, sa config doit refléter
  ces conventions, pas les remplacer.
- **Lib externes avec leur propre style** : on ne reformatte pas le code
  importé. Les conventions s'appliquent au code écrit dans `src/`.
- **Renommage rétroactif** : si une convention évolue, le code existant
  reste tel quel. Les nouvelles écritures suivent la nouvelle convention,
  les anciennes sont mises à jour opportunément (au prochain refactor de
  la zone concernée).

## Questions ouvertes

Aucune.

## Décisions

Voir ADR-001 et ADR-002 dans [`../decisions.md`](../decisions.md) pour
l'historique des décisions de nommage critique (custom element tag,
chargement dotenv).
