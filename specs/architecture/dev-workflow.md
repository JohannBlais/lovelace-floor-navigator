---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [tech-stack.md]
---

# Dev Workflow

Workflow de développement quotidien : modes dev, déploiement HA réel,
cycle de release. Spec figée pour la v0.1.0.

## Contexte

Le développement d'une custom card Lovelace combine deux phases avec des
contraintes différentes :

- **Itération rapide visuelle** : tuning de positions, transitions,
  styles. Pas besoin de HA réel, mock suffit.
- **Validation intégration** : test sur le vrai HA avec les vraies
  entités. Nécessaire avant chaque release.

L'écosystème HACS a convergé sur des conventions partagées
(`HA_LOCAL_DIR`, `TARGET_DIRECTORY`) qu'on adopte pour rester aligné.

## Objectifs

1. Itération visuelle en quelques secondes (pas de cycle build/install)
2. Test intégration HA en quelques minutes (pas de copie manuelle de
   fichier)
3. Cycle de release reproductible via GitHub Actions
4. Pas de friction côté HAOS (pas de ssh root quotidien)

## Scope

### In

- Mode "dev rapide" (page HTML standalone)
- Mode "test intégration" (déploiement HA via Samba)
- Cycle de release v0.1.x
- Notes spécifiques à l'environnement de Johann

### Out

- Build configuration (voir [`tech-stack.md`](tech-stack.md))
- Code style (voir [`conventions.md`](conventions.md))

## Comportement attendu — Mode "dev rapide"

**Quand l'utiliser** : développement courant, itération sur le visuel,
tuning des transitions et des positions d'icônes. Mode par défaut pour
~80% du temps de dev.

### Setup

- `dev/index.html` charge le bundle compilé avec un mock du `hass` object
- `dev/mock-hass.ts` simule 5-10 entités (1 light, 1 sensor, 1
  binary_sensor, etc.) avec des états faux mais réalistes, et un
  mécanisme pour simuler des state changes
- Servi via un static server local (ex: `npx serve dev/` ou
  `python -m http.server` depuis `dev/`)
- Reload manuel après `npm run build` (~2s de build)

### Avantages

- Itération en quelques secondes
- Pas besoin de HA pour tester
- Debug DOM facile (DevTools natif)
- Hot reload du JS en relançant juste un build

## Comportement attendu — Mode "test intégration"

**Quand l'utiliser** : avant chaque release v0.1.x, pour valider que la
card fonctionne dans le vrai HA avec les vraies entités. Aussi quand un
bug ne peut être reproduit qu'avec des données HA réelles.

**Pattern** : convention HACS standard `HA_LOCAL_DIR` (équivalent à
`TARGET_DIRECTORY` de streamline-card) via variable d'environnement, lue
par Rollup.

### Setup côté HAOS (une seule fois)

1. Installer l'add-on **"Samba share"** : Settings → Add-ons → Add-on
   Store → Samba share → Install
2. Configurer un username + password dédié pour le partage SMB
3. Démarrer l'add-on, activer "Start on boot"

Le partage expose `/config` en SMB, accessible à `\\<haos-ip>\config\`.

### Setup côté poste de dev (une seule fois)

1. Mapper le partage `\\<haos-ip>\config\` comme lecteur réseau (ex:
   lettre `Z:` sur Windows)
2. Dans le repo `lovelace-floor-navigator`, créer un fichier
   `.env.local` (gitignored) :

```env
# Pointe vers le dossier www/ de HAOS, accessible via le mapping Samba.
# Le sous-dossier floor-navigator/ sera créé au premier build watch.
HA_LOCAL_DIR=Z:/www/floor-navigator
```

3. Vérifier que `Z:/www/` existe (créé automatiquement par HA si la card
   avait été installée via HACS, sinon le créer manuellement une fois)

### Setup côté Lovelace (une seule fois)

Déclarer la ressource dans Lovelace via l'UI :
- Paramètres → Tableaux de bord → Ressources → Ajouter
- URL : `/local/floor-navigator/floor-navigator.js?v=DEV`
- Type : Module JavaScript

### Workflow quotidien

1. Lancer `npm run watch` dans le repo
2. Modifier le code dans `src/`
3. À chaque save, Rollup rebuild et écrit directement dans
   `Z:/www/floor-navigator/floor-navigator.js`
4. Recharger le tableau de bord dans HA avec `Ctrl+Shift+R` (force le
   bypass du cache navigateur)
5. Voir le changement en direct, sur les vraies entités

## Comportement attendu — Cache busting

Le query string `?v=DEV` dans la déclaration de ressource ne change pas,
donc HA va parfois servir la version cachée. Solutions :

- `Ctrl+Shift+R` après chaque save (le plus fiable au quotidien)
- Pour forcer un reload : changer manuellement `?v=DEV` en `?v=DEV2`
  dans Resources et reload
- Pour la prod : la GitHub Action de release pourra ajouter
  automatiquement le hash du commit à la fin du fichier (idée v0.2.0+,
  voir BACKLOG.md)

## Comportement attendu — Cycle de release v0.1.x

1. Tester en mode dev rapide puis test intégration jusqu'à satisfaction
2. Tag git `v0.X.Y` sur la branche `main`
3. GitHub Actions build le bundle prod, attache `floor-navigator.js` à
   la release GitHub (asset téléchargeable)
4. Le binaire peut être téléchargé et placé manuellement dans
   `/config/www/floor-navigator/`, ou installé via custom repo HACS

**Pas de soumission HACS officielle en v0.1.x**. La soumission HACS se
fait quand le composant est mature (cible : v0.3.0). En attendant,
l'utilisateur HACS-aware peut installer la card en ajoutant le repo en
"Custom Repository" dans HACS, ce qui permet déjà de tester sans copie
manuelle.

## Cas limites

### `HA_LOCAL_DIR` invalide

Si le mapping Samba est down ou le path n'existe pas, Rollup en mode
watch écrit malgré tout — il tombe sur une erreur d'écriture explicite,
pas un fallback silencieux. Le développeur voit immédiatement que le
mapping est cassé.

### Plusieurs HA cibles

Pour développer sur deux HA différents (test + prod), changer le
`.env.local` à chaque fois. Pas de support natif multi-targets en
v0.1.0. Si besoin, faire 2 clones du repo avec leur propre `.env.local`.

### Sans Samba (Linux/macOS)

Le mode "test intégration" suppose Samba mais n'importe quel partage
qui mappe `/config` en local fonctionne (NFS, SSHFS, etc.). La variable
`HA_LOCAL_DIR` accepte n'importe quel path de filesystem local valide.

### Build prod en CI

GitHub Actions exécute `npm run build` sans `.env.local` → fallback sur
`dist/` (cf. [`tech-stack.md`](tech-stack.md)). Le bundle est attaché à
la release par `release.yml`.

## Notes spécifiques à l'environnement Johann

Hors-spec mais utile pour le bootstrap :

- HAOS de Johann est en `192.168.1.61`. Le partage Samba est
  `\\192.168.1.61\config\`.
- Le poste de dev principal est "Fatboy" (Bureau L2). Le mapping `Z:`
  est défini là-dessus.
- Le repo HA principal `JohannBlais/homeassistant-config` est privé et
  utilise un Git Pull add-on. Le repo `lovelace-floor-navigator` est
  distinct, privé jusqu'à v0.3.0 (stratégie publish polished).
- Préférence personnelle : `transition_duration: 300` (au lieu du défaut
  400) — réduit le motion sickness à l'usage répété. À noter dans la
  config Johann uniquement, pas changement de défaut SPEC.

## Questions ouvertes

Aucune.

## Décisions

Pas d'ADR formel sur ce sujet. Le choix de Samba (vs SSHFS, vs upload
manuel) a été dicté par l'add-on HAOS officiel "Samba share" qui rend la
config triviale.
