---
status: implemented
owner: Johann Blais
last_updated: 2026-05-03
related: [conventions.md, dev-workflow.md]
---

# Tech Stack

Stack technique du composant : dépendances, configuration de build,
manifest HACS, scripts npm. Spec figée pour la v0.1.0.

## Contexte

Choix d'une stack qui maximise la compatibilité HACS et minimise la dette
technique pour un projet OS solo. Décisions prises en début de design
session : Lit 3 + TypeScript strict + Rollup, alignées avec les custom
cards de référence (Mushroom, Mini-Graph).

## Objectifs

1. Bundle final < 50 KB minifié (cible spec, contrainte HACS courante)
2. Zéro framework lourd (pas de React/Vue), Lit suffit pour custom
   elements
3. Build reproductible localement et en CI sans surprise
4. Workflow dev → HA réel sans étapes manuelles intermédiaires

## Scope

### In

- Dépendances runtime + dev
- Config TypeScript
- Config Rollup
- Manifest HACS
- Scripts npm
- Structure du repo

### Out

- Workflow d'utilisation au quotidien (voir
  [`dev-workflow.md`](dev-workflow.md))
- Code style (voir [`conventions.md`](conventions.md))

## Comportement attendu — Dépendances

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
    "@rollup/plugin-terser": "^0.4.0",
    "rollup": "^4.0.0",
    "tslib": "^2.6.0",
    "dotenv": "^16.0.0"
  }
}
```

`custom-card-helpers` apporte `handleAction` et `hasAction` pour les
tap_actions HA standards. Empreinte ~3 KB minifié. Voir BACKLOG.md pour
une option de vendoring si la dette devient critique.

## Comportement attendu — Configuration TypeScript

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

Mode strict obligatoire — pas de `any` qui passe, pas de variable inutilisée
en review.

`useDefineForClassFields: false` est nécessaire pour que les decorators
Lit (`@property`, `@state`) fonctionnent comme attendu.

## Comportement attendu — Configuration Rollup

`rollup.config.js` :

```javascript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

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

### Chargement explicite de `.env.local`

Utilisation explicite de `dotenv.config({ path: '.env.local' })` plutôt
que `import 'dotenv/config'`. Le raccourci charge `.env` par défaut
(comportement standard de la lib dotenv) et **ne charge PAS** `.env.local`.
La convention `.env.local` qui override `.env` est spécifique à
Vite/Next.js, pas à dotenv vanilla.

Voir ADR-002 dans [`../decisions.md`](../decisions.md).

### Mode watch vs build

- `npm run watch` : `ROLLUP_WATCH=true`, écrit dans `HA_LOCAL_DIR` si
  défini, sinon `dist/`. Pas de minification (sourcemaps actifs).
- `npm run build` : pas de watch, écrit dans `dist/`, minification +
  sourcemaps désactivés.

## Comportement attendu — Manifest HACS

`hacs.json` minimal :

```json
{
  "name": "Floor Navigator",
  "render_readme": true,
  "filename": "floor-navigator.js"
}
```

`render_readme: true` permet à HACS d'afficher le README directement dans
l'interface utilisateur. `filename` pointe sur le bundle produit par
Rollup en mode prod.

## Comportement attendu — Structure du repo

```
lovelace-floor-navigator/
├── .github/
│   └── workflows/
│       ├── build.yml          # build sur PR
│       └── release.yml        # build + release auto sur tag
├── docs/
│   ├── examples/              # configs YAML d'exemple
│   │   ├── minimal.yaml
│   │   ├── full-house.yaml
│   │   ├── themed.yaml
│   │   └── README.md
│   └── screenshots/
├── specs/                     # specs vivantes (ce dossier)
├── dev/
│   ├── index.html             # page de test standalone (mode dev rapide)
│   ├── mock-hass.ts           # mock du hass object pour dev local
│   └── test-floors/           # SVG/PNG de test
├── src/
│   ├── floor-navigator-card.ts
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
│   │   ├── config.ts
│   │   └── ha.ts
│   ├── utils/
│   │   ├── color-resolver.ts
│   │   └── icon-resolver.ts
│   └── styles/
│       └── card-styles.ts
├── dist/                      # gitignored, contient le bundle prod
├── BACKLOG.md                 # irritants vivants
├── .env.local.example
├── .gitignore                 # inclut .env.local et dist/
├── LICENSE                    # MIT
├── README.md
├── hacs.json
├── package.json
├── rollup.config.js
└── tsconfig.json
```

## Comportement attendu — Scripts npm

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
- `npm run watch` : rebuild auto à chaque save, vers `HA_LOCAL_DIR` si
  configuré, sinon `dist/`
- `npm run dev` : rappel pour lancer la page standalone (cf.
  [`dev-workflow.md`](dev-workflow.md))
- `npm run lint` : type-checking sans build, utile en CI

## Cas limites

### Bundle qui dépasse 50 KB

Cible spec, pas un blocker dur. Si dépassement à v0.2.0+, options dans
l'ordre :

1. Vendoring de `custom-card-helpers` (gain ~3 KB)
2. Tree-shaking plus agressif des helpers Lit non utilisés
3. Lazy-loading de transitions ou composants secondaires

Voir BACKLOG.md pour les options déjà identifiées.

### Build CI sans `.env.local`

`.env.local` est gitignored donc absent en CI. `dotenv.config()` ne
crashe pas si le fichier est absent — il logge une `MODULE_NOT_FOUND`
swallowed et continue. La variable `HA_LOCAL_DIR` est alors `undefined`
et Rollup tombe sur le fallback `dist/`. Comportement attendu en CI.

### Upgrade Lit 4

Lit 4 (hypothétique) pourrait introduire des breaking changes sur les
decorators. À gérer comme une décision de stack à part entière (ADR
dédié) le moment venu.

## Questions ouvertes

Aucune.

## Décisions

- ADR-002 — Chargement explicite de `.env.local` côté Rollup (2026-05-01)

Voir [`../decisions.md`](../decisions.md).
