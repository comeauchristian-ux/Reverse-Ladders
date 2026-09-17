# Reverse Ladders

A local-first reverse-ladder strength training PWA. Product requirements are in
[SPEC.md](SPEC.md); the visual reference is [mockup.png](mockup.png).

## Current milestone

Milestone 1 supplies the React + Vite + TypeScript application shell, hash routing,
mobile CSS, and production PWA configuration. Exercise management, the ladder
engine, IndexedDB schemas/repositories, workouts, and history are future milestones.
The `idb` dependency is ready for the storage layer; this shell does not yet save data.

## Development

Use Node.js 22.12+ (22.x) or 24+ and npm. The lockfile records exact dependency versions.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.
Domain unit tests will be added alongside the ladder engine in milestone 2.

## Structure

- `src/components/`: shared presentation, starting with the app layout.
- `src/pages/`: route-level screens.
- `src/hooks/`: future React state/effect integration.
- `src/lib/ladder/`: future pure progression functions.
- `src/lib/workout/`: future workout transitions and timestamp calculations.
- `src/lib/storage/`: future versioned IndexedDB repositories using `idb`.
- `src/lib/stats/`: future calculations from recorded performance.
- `src/types/`: future shared domain types.
- `tests/`: future domain and integration tests.
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
