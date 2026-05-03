---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [conventions.md, dev-workflow.md]
---

# Tech Stack

Component technical stack: dependencies, build configuration, HACS
manifest, npm scripts. Frozen spec for v0.1.0.

## Context

Choice of a stack that maximises HACS compatibility and minimises
technical debt for a solo OS project. Decisions taken at the start of
the design session: Lit 3 + strict TypeScript + Rollup, aligned with
the reference custom cards (Mushroom, Mini-Graph).

## Goals

1. Final bundle < 50 KB minified (spec target, common HACS
   constraint)
2. No heavy framework (no React/Vue), Lit is enough for custom
   elements
3. Reproducible build locally and in CI without surprises
4. Dev → real HA workflow without manual intermediate steps

## Scope

### In

- Runtime + dev dependencies
- TypeScript config
- Rollup config
- HACS manifest
- npm scripts
- Repo structure

### Out

- Day-to-day usage workflow (see
  [`dev-workflow.md`](dev-workflow.md))
- Code style (see [`conventions.md`](conventions.md))

## Expected behaviour — Dependencies

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

`custom-card-helpers` provides `handleAction` and `hasAction` for the
HA standard tap_actions. ~3 KB minified footprint. See BACKLOG.md for a
vendoring option if the cost becomes critical.

## Expected behaviour — TypeScript configuration

`tsconfig.json`:

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

Strict mode mandatory — no `any` slips through, no unused variable in
review.

`useDefineForClassFields: false` is required for the Lit decorators
(`@property`, `@state`) to behave as expected.

## Expected behaviour — Rollup configuration

`rollup.config.js`:

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

### Explicit `.env.local` loading

We use `dotenv.config({ path: '.env.local' })` explicitly rather than
`import 'dotenv/config'`. The shortcut loads `.env` by default
(standard dotenv lib behaviour) and **does NOT load** `.env.local`.
The `.env.local` overrides `.env` convention is specific to
Vite/Next.js, not to vanilla dotenv.

See ADR-002 in [`../decisions.md`](../decisions.md).

### Watch vs build modes

- `npm run watch`: `ROLLUP_WATCH=true`, writes to `HA_LOCAL_DIR` if
  set, otherwise `dist/`. No minification (sourcemaps enabled).
- `npm run build`: no watch, writes to `dist/`, minification +
  sourcemaps disabled.

## Expected behaviour — HACS manifest

Minimal `hacs.json`:

```json
{
  "name": "Floor Navigator",
  "render_readme": true,
  "filename": "floor-navigator.js"
}
```

`render_readme: true` lets HACS display the README directly in the UI.
`filename` points to the bundle produced by Rollup in prod mode.

## Expected behaviour — Repo structure

```
lovelace-floor-navigator/
├── .github/
│   └── workflows/
│       ├── build.yml          # build on PR
│       └── release.yml        # build + auto release on tag
├── docs/
│   ├── examples/              # example YAML configs
│   │   ├── minimal.yaml
│   │   ├── full-house.yaml
│   │   ├── themed.yaml
│   │   └── README.md
│   └── screenshots/
├── specs/                     # living specs (this folder)
├── dev/
│   ├── index.html             # standalone test page (quick dev mode)
│   ├── mock-hass.ts           # hass mock for local dev
│   └── test-floors/           # test SVGs/PNGs
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
├── dist/                      # gitignored, contains the prod bundle
├── BACKLOG.md                 # living irritants
├── .env.local.example
├── .gitignore                 # includes .env.local and dist/
├── LICENSE                    # MIT
├── README.md
├── hacs.json
├── package.json
├── rollup.config.js
└── tsconfig.json
```

## Expected behaviour — npm scripts

`package.json` excerpt:

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

- `npm run build`: minified prod build into `dist/`
- `npm run watch`: auto-rebuild on save, into `HA_LOCAL_DIR` if
  configured, otherwise `dist/`
- `npm run dev`: reminder for launching the standalone page (see
  [`dev-workflow.md`](dev-workflow.md))
- `npm run lint`: type-checking without build, useful in CI

## Edge cases

### Bundle exceeding 50 KB

Spec target, not a hard blocker. If exceeded in v0.2.0+, options in
order of preference:

1. Vendoring `custom-card-helpers` (~3 KB gain)
2. More aggressive tree-shaking of unused Lit helpers
3. Lazy-loading transitions or secondary components

See BACKLOG.md for already-identified options.

### CI build without `.env.local`

`.env.local` is gitignored so absent in CI. `dotenv.config()` does not
crash if the file is missing — it logs a swallowed `MODULE_NOT_FOUND`
and continues. The `HA_LOCAL_DIR` variable is then `undefined` and
Rollup falls back to `dist/`. Expected behaviour in CI.

### Lit 4 upgrade

Lit 4 (hypothetical) might introduce breaking changes on decorators.
To handle as a stack-level decision (dedicated ADR) when the time
comes.

## Open questions

None.

## Decisions

- ADR-002 — Explicit `.env.local` loading on the Rollup side (2026-05-01)

See [`../decisions.md`](../decisions.md).
