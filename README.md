# Reverse Ladders

A local-first reverse-ladder strength training PWA. Product requirements are in
[SPEC.md](SPEC.md); the visual reference is [mockup.png](mockup.png).

## Current milestone

Milestones 1 and 2 supply the React + Vite + TypeScript application shell, hash
routing, mobile CSS, production PWA configuration, and a tested pure TypeScript
ladder engine. Exercise management, IndexedDB schemas/repositories, workouts, and
history are future milestones.
The `idb` dependency is ready for the storage layer; this shell does not yet save data.

## Development

Use Node.js 22.12+ (22.x) or 24+ and npm. The lockfile records exact dependency versions.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.
Unit tests use Node's built-in runner with TypeScript stripping, without additional
test dependencies. `npm run typecheck` and `npm run build` also type-check tests.

## Ladder engine

`src/lib/ladder/index.ts` exports three pure functions:

- `getProgressionMinimums(N, T)` returns N minimums, with `null` for tail sets.
- `didPassProgression(N, T, actualReps)` checks the ordered qualifying prefix using
  minimum thresholds. Missing required sets fail; extra reps and zero tail reps are
  allowed. A passing prefix does not indicate workout completion. The future workout
  layer must require all N sets before saving a session or changing progression.
- `getNextProgression(N, T, progressionSuccess = true)` returns a suggested
  `{ ladderSize, target }`: one step on success, unchanged on failure. The default
  supports pre-workout previews. It never skips levels or persists a change.

Ladders require safe integers with `N >= 2` and `2 <= T <= N`, so the duplicated
bottom rung fits within N sets. Since the spec defines no rollover after `N:N`,
the suggestion stays at `N:N`; a later UI can let the user choose another ladder.
Invalid ladders, negative/fractional/non-finite reps, sparse rep sequences, and
more than N recorded sets throw `RangeError`. Tail reps are validated as data but
are never compared against a progression threshold.

## Structure

- `src/components/`: shared presentation, starting with the app layout.
- `src/pages/`: route-level screens.
- `src/hooks/`: future React state/effect integration.
- `src/lib/ladder/`: pure progression functions and the ladder state type.
- `src/lib/workout/`: future workout transitions and timestamp calculations.
- `src/lib/storage/`: future versioned IndexedDB repositories using `idb`.
- `src/lib/stats/`: future calculations from recorded performance.
- `src/types/`: future shared domain types.
- `tests/`: ladder engine unit tests; future integration tests.
- `public/`: local app icons, including placeholder PNGs for installation.

Business rules belong outside React. Components should call the storage layer
rather than opening IndexedDB themselves. React state/hooks will manage UI state;
no global state-management library is included.

## GitHub Pages and base paths

The default base path is `/`. For a repository site, copy `.env.example` to
`.env.local` and set `VITE_BASE_PATH` to the exact case-sensitive repository path,
such as `/Reverse-Ladders/`. Run `npm run build`, then publish the contents of `dist/`
through your preferred GitHub Pages deployment workflow. No deployment is performed
by these scripts.

Use `VITE_BASE_PATH` rather than a separate CLI `--base` override so the manifest,
service-worker scope, and built asset paths share the same setting. Preview the
build at the configured path, for example `http://localhost:4173/Reverse-Ladders/`.
Routes use hashes (`/Reverse-Ladders/#/…`), so route refreshes do not require server
rewrites. Unknown routes show a return-home link.

## PWA behavior

Production builds generate a manifest and service worker using `vite-plugin-pwa`.
After an initial online visit and service-worker installation, the application shell
is cached for offline use. Assets and fonts are local. HTTPS (or localhost) is required
for service workers. Development mode intentionally does not register one.

Updates wait for existing app windows to close; they do not force a reload. A future
workout-aware update prompt can be added with the workout flow. Placeholder icons,
standalone display, theme metadata, and safe-area spacing are included. Full device
installation and interrupted-workout checks belong to later milestones.
