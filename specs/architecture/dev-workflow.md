---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [tech-stack.md]
---

# Dev Workflow

Day-to-day development workflow: dev modes, real-HA deployment, release
cycle. Frozen spec for v0.1.0.

## Context

Developing a Lovelace custom card combines two phases with different
constraints:

- **Quick visual iteration**: tuning positions, transitions, styles. No
  real HA needed; a mock is sufficient.
- **Integration validation**: testing on real HA against real entities.
  Required before each release.

The HACS ecosystem has converged on shared conventions
(`HA_LOCAL_DIR`, `TARGET_DIRECTORY`); we adopt them to stay aligned.

## Goals

1. Visual iteration in seconds (no build/install cycle)
2. HA integration testing in minutes (no manual file copying)
3. Reproducible release cycle via GitHub Actions
4. No friction on the HAOS side (no daily ssh root)

## Scope

### In

- "Quick dev" mode (standalone HTML page)
- "Integration test" mode (HA deployment via Samba)
- v0.1.x release cycle
- Notes specific to Johann's environment

### Out

- Build configuration (see [`tech-stack.md`](tech-stack.md))
- Code style (see [`conventions.md`](conventions.md))

## Expected behaviour — Quick dev mode

**When to use**: routine development, visual iteration, tuning
transitions and icon positions. Default mode for ~80% of dev time.

### Setup

- `dev/index.html` loads the compiled bundle alongside a mock `hass`
  object
- `dev/mock-hass.ts` simulates 5–10 entities (1 light, 1 sensor, 1
  binary_sensor, etc.) with fake but realistic states, plus a mechanism
  to simulate state changes
- Served via a local static server (e.g. `npx serve dev/` or
  `python -m http.server` from `dev/`)
- Manual reload after `npm run build` (~2s build)

### Benefits

- Iteration in seconds
- No HA needed for testing
- Easy DOM debugging (native DevTools)
- JS hot reload by re-running a build

## Expected behaviour — Integration test mode

**When to use**: before each v0.1.x release, to validate that the card
works in real HA against real entities. Also when a bug can only be
reproduced with real HA data.

**Pattern**: standard HACS convention `HA_LOCAL_DIR` (equivalent to
`TARGET_DIRECTORY` in streamline-card) via an environment variable read
by Rollup.

### HAOS side setup (one-time)

1. Install the **"Samba share"** add-on: Settings → Add-ons → Add-on
   Store → Samba share → Install
2. Configure a dedicated username + password for the SMB share
3. Start the add-on, enable "Start on boot"

The share exposes `/config` over SMB, accessible at
`\\<haos-ip>\config\`.

### Dev machine side setup (one-time)

1. Map the share `\\<haos-ip>\config\` as a network drive (e.g. drive
   letter `Z:` on Windows)
2. In the `lovelace-floor-navigator` repo, create a `.env.local` file
   (gitignored):

```env
# Points to the HAOS www/ folder, accessible via the Samba mapping.
# The floor-navigator/ subfolder will be created on the first watch build.
HA_LOCAL_DIR=Z:/www/floor-navigator
```

3. Verify that `Z:/www/` exists (created automatically by HA if the card
   was installed via HACS, otherwise create it manually once)

### Lovelace side setup (one-time)

Declare the resource in Lovelace via the UI:
- Settings → Dashboards → Resources → Add
- URL: `/local/floor-navigator/floor-navigator.js?v=DEV`
- Type: JavaScript Module

### Daily workflow

1. Run `npm run watch` in the repo
2. Edit code in `src/`
3. On every save, Rollup rebuilds and writes directly to
   `Z:/www/floor-navigator/floor-navigator.js`
4. Reload the dashboard in HA with `Ctrl+Shift+R` (forces a browser
   cache bypass)
5. See the change live, against real entities

## Expected behaviour — Cache busting

The `?v=DEV` query string in the resource declaration does not change,
so HA will sometimes serve the cached version. Workarounds:

- `Ctrl+Shift+R` after every save (most reliable day-to-day)
- To force a reload: manually change `?v=DEV` to `?v=DEV2` in Resources
  and reload
- For prod: the release GitHub Action could automatically append the
  commit hash to the file (idea for v0.2.0+, see BACKLOG.md)

## Expected behaviour — v0.1.x release cycle

1. Test in quick dev mode then integration test mode until satisfied
2. Git tag `v0.X.Y` on the `main` branch
3. GitHub Actions builds the prod bundle, attaches `floor-navigator.js`
   to the GitHub release (downloadable asset)
4. The binary can be downloaded and placed manually in
   `/config/www/floor-navigator/`, or installed via custom HACS repo

**No official HACS submission in v0.1.x.** HACS submission happens once
the component is mature (target: v0.3.0). Until then, HACS-aware users
can install the card by adding the repo as a "Custom Repository" in
HACS, which already lets them test without manual copying.

## Edge cases

### Invalid `HA_LOCAL_DIR`

If the Samba mapping is down or the path does not exist, Rollup in
watch mode still tries to write — it surfaces an explicit write error,
not a silent fallback. The developer immediately sees that the mapping
is broken.

### Multiple HA targets

To develop against two different HAs (test + prod), change `.env.local`
each time. No native multi-targets support in v0.1.0. If needed, clone
the repo twice with their own `.env.local`.

### Without Samba (Linux/macOS)

Integration test mode assumes Samba but any share mapping `/config`
locally works (NFS, SSHFS, etc.). The `HA_LOCAL_DIR` variable accepts
any valid local filesystem path.

### Prod build in CI

GitHub Actions runs `npm run build` without `.env.local` → fallback to
`dist/` (see [`tech-stack.md`](tech-stack.md)). The bundle is attached
to the release by `release.yml`.

## Notes specific to Johann's environment

Off-spec but useful for bootstrap:

- Johann's HAOS is at `192.168.1.61`. The Samba share is therefore
  `\\192.168.1.61\config\`.
- The main dev machine is "Fatboy" (Bureau L2). The `Z:` mapping is
  set up there.
- The main HA repo `JohannBlais/homeassistant-config` is private and
  uses a Git Pull add-on. The `lovelace-floor-navigator` repo is
  separate, private until v0.3.0 (publish-polished strategy).
- Personal preference: `transition_duration: 300` (instead of the
  default 400) — reduces motion sickness with repeated use. To note in
  Johann's config only, not as a default change in the spec.

## Open questions

None.

## Decisions

No formal ADR on this topic. The choice of Samba (vs SSHFS, vs manual
upload) was driven by the official HAOS "Samba share" add-on which
makes the configuration trivial.
