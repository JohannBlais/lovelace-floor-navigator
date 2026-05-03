---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [conventions.md, tech-stack.md]
---

# Identity

Nomenclature et identité figée du composant. Spec figée — toute évolution
est un breaking change versionné.

## Contexte

Le composant existe sous plusieurs noms selon le contexte (repo GitHub,
package npm, custom element DOM, type YAML, label HACS). Aligner ces
noms évite les confusions et bugs subtils (notamment le mismatch entre
custom element tag et type YAML, qui produit l'erreur "Custom element
doesn't exist" au chargement).

## Objectifs

1. Une nomenclature unique référencée partout
2. Conformité aux conventions HACS pour faciliter l'installation
3. Clarté pour l'utilisateur final (config YAML lisible)

## Scope

### In

- Nom du repo, du package, de la classe, du custom element
- Type YAML utilisé dans la config Lovelace
- Label HACS

### Out

- Implémentation (voir composants `src/`)
- Conventions de code (voir [`conventions.md`](conventions.md))

## Comportement attendu — Nomenclature figée

| Élément | Valeur |
|---|---|
| Nom du repo GitHub | `lovelace-floor-navigator` |
| Owner GitHub | `JohannBlais` |
| **Custom element tag** | **`floor-navigator-card`** |
| **Type YAML** | **`custom:floor-navigator-card`** |
| Nom de la classe TS | `FloorNavigatorCard` |
| Nom du package npm | `lovelace-floor-navigator` |
| Nom marketing HACS | "Floor Navigator" |
| Filename du bundle | `floor-navigator.js` |

## Cas limites

### Mismatch tag / type YAML

Le custom element tag (`floor-navigator-card`) et le type YAML
(`custom:floor-navigator-card`) doivent matcher exactement. HA résout
`type: custom:<X>` en cherchant un custom element défini avec
`customElements.define('<X>', ...)`. Si les deux ne matchent pas,
l'erreur "Custom element doesn't exist" apparaît au chargement de la
card.

La convention HACS standard est de suffixer le custom element tag en
`-card` (cf. `mushroom-light-card`, `mini-graph-card`, `button-card`,
`bubble-card`). Notre tag suit cette convention.

Voir ADR-001 dans [`../decisions.md`](../decisions.md) pour l'historique
de cette décision.

### Renommage du repo

Le nom du repo GitHub influence l'URL d'installation custom HACS et les
liens externes. **Renommer le repo serait un breaking change pour les
utilisateurs HACS**. Pas envisagé avant publication HACS officielle.

### Conflit de namespace

Le préfixe `fn-` du custom element et des CSS variables est court
(2 lettres). Risque théorique de collision avec une autre card qui
utiliserait le même préfixe. À ce jour, aucune custom card HACS connue
ne prend ce préfixe. Si une collision apparaissait, le mainteneur
adverse changerait probablement (préfixes courts = first-come,
first-served dans la communauté).

## Licence

MIT (standard HACS, permet réutilisation maximale, y compris commerciale).

## Questions ouvertes

Aucune.

## Décisions

- ADR-001 — Custom element tag suffixé en `-card` (2026-05-01)

Voir [`../decisions.md`](../decisions.md) pour le détail.
