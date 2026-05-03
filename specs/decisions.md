---
status: validated
owner: Johann Blais
last_updated: 2026-05-03
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

## Template pour les futures décisions

Copier-coller en tête de la liste, juste sous le séparateur principal.
Numéroter `ADR-NNN` en continuant la suite (la dernière en date est
`ADR-004`).
