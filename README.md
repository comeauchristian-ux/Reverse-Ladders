# Reverse Ladders

A local-first reverse-ladder strength training PWA. Product requirements are in
[SPEC.md](SPEC.md); the visual reference is [mockup.png](mockup.png).

## Current milestone

Milestones 1–6 supply the React + Vite + TypeScript application, hash routing,
mobile CSS, PWA configuration, tested ladder engine, and persistent exercise
management. Add an exercise from the home screen, tap its card to see its ladder
and minimum progression requirement, and use Edit to change its settings.
Start a guided workout from an exercise, record actual reps, and follow the
automatic rest timer. Completion shows reps, duration, density, and progression
outcome, with an editable next-session ladder. Each exercise has history,
compact statistics, and a separate max-rep test form. Mobile layout polish,
accessible set progress, offline status, and automated release checks are included.
Real-browser visual/offline checks and installed-device acceptance are still pending;
see [release checks and their recorded status](docs/RELEASE_CHECKS.md).

Exercises are stored in local IndexedDB through `idb`. Database version 1 also
defines stores for completed workouts, max-rep tests, the current active workout
(including rest timestamps), and preferences. No account or server is involved.
Deletion requires confirmation and hides the exercise without removing historical
records. The UI does not yet expose archived exercises. An active workout prevents
deletion. Revisions protect edits/deletes against stale data from another window.
Workout snapshots preserve the attempted ladder, name, variation, load type/unit,
and rest setting independently of later exercise changes.

## Guided workouts

One active workout is allowed at a time. Each set is committed before the UI
advances, with a revision check to reject duplicate or stale submissions. Minimum
sets default to their threshold; flexible tail sets default to the preceding
actual count and accept zero or more reps. Rest starts after every non-final set
(zero-second rest goes straight to the next set), and can be skipped.

The rest deadline and workout start are persisted timestamps. Refreshing or
reopening offers Continue/Discard, and expired rest resumes at the next set.
Elapsed time includes time spent away and freezes at the final set timestamp.
Unsubmitted rep input is not a recorded set and resets to its default on reload.

The final set and completed workout record save in one transaction. Done or
Save and view history then commits the selected progression decision, exercise
update, and active-slot cleanup in another atomic transaction. A saved decision
cannot be applied twice. Suggested progression moves only one target on success
and stays unchanged on failure or at N:N. The user can override it or explicitly
keep current exercise settings. If the exercise was edited during the workout,
the default is to preserve those edits; stale submissions are rejected.
Discard requires confirmation and only removes the unfinished active session.

Optional sound and vibration preferences persist. Alerts are best effort: browser
suspension, platform support, and device settings may prevent them while locked.
The timer still reconstructs correctly when the app resumes. Background alarms
and installed-device behavior require manual checks on the target device.

## History and statistics

History combines completed workouts and separately labeled max-rep tests, newest
first. Workout entries retain the original ladder, load, variation, rest setting,
actual sequence, and missed minimums. Date-only max tests display in local time
and sort at local noon on that date. They never change ladder progression or
contribute to workout statistics. Max tests support bodyweight, added/external
load, units, a date, reps, and optional notes.

Summary/history metrics are recalculated from sets and raw timestamps. Average
density is the arithmetic mean of session densities. Zero-duration sessions show
no density and are excluded from average/best density. Highest ladders compare N
first, then T, independent of load/variation. Existing version-1 records remain
readable; snapshot revisions and progression decisions are optional additive
fields, so no destructive schema migration is needed.

## Development

Use Node.js 22.12+ (22.x) or 24+ and npm. The lockfile records exact dependency versions.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
npm run check
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.
Unit tests use Node's built-in runner with TypeScript stripping. Storage tests use
`fake-indexeddb` to verify persistence across connection reopen, validation, stale
edits, and history preservation. `npm run typecheck` and `npm run build` also
type-check tests. Device storage and installation still need real-browser checks.
`npm run check` additionally builds and verifies root/subdirectory artifacts and
local HTTP paths. It leaves a root build in `dist/` and an ignored test build in
`.release-check/`. Run `npm run build` afterward when using a custom deployment base.

## Ladder engine

`src/lib/ladder/index.ts` exports three pure functions:

- `getProgressionMinimums(N, T)` returns N minimums, with `null` for tail sets.
- `didPassProgression(N, T, actualReps)` checks the ordered qualifying prefix using
  minimum thresholds. Missing required sets fail; extra reps and zero tail reps are
  allowed. A passing prefix does not indicate workout completion. The workout
  layer requires all N sets before saving a session or changing progression.
- `getNextProgression(N, T, progressionSuccess = true)` returns a suggested
  `{ ladderSize, target }`: one step on success, unchanged on failure. The default
  supports pre-workout previews. It never skips levels or persists a change.

Ladders require safe integers with `N >= 2` and `2 <= T <= N`, so the duplicated
bottom rung fits within N sets. Since the spec defines no rollover after `N:N`,
the suggestion stays at `N:N`; the completion screen lets the user choose another ladder.
Invalid ladders, negative/fractional/non-finite reps, sparse rep sequences, and
more than N recorded sets throw `RangeError`. Tail reps are validated as data but
are never compared against a progression threshold.

## Structure

- `src/components/`: shared presentation, starting with the app layout.
- `src/pages/`: route-level screens.
- `src/hooks/`: React data-loading integration.
- `src/lib/ladder/`: pure progression functions and the ladder state type.
- `src/lib/workout/`: pure workout transitions and timestamp calculations.
- `src/lib/storage/`: versioned IndexedDB schema and exercise repository using `idb`.
- `src/lib/stats/`: summary and exercise statistics from recorded performance.
- `src/types/`: exercise, snapshot, workout, max-rep, and preferences records.
- `tests/`: ladder engine, workout transitions, and IndexedDB integration tests.
- `public/`: local app icons, including placeholder PNGs for installation.

Business rules belong outside React. Components should call the storage layer
rather than opening IndexedDB themselves. React state/hooks will manage UI state;
no global state-management library is included.

## GitHub Pages and base paths

The default base path is `/`. For a repository site, copy `.env.example` to
`.env.local` and set `VITE_BASE_PATH` to the exact case-sensitive repository path,
such as `/Reverse-Ladders/`. Run `npm run build`, then publish the contents of `dist/`
using the included manual **Deploy to GitHub Pages** workflow. Enable GitHub Actions
as the Pages source first. The workflow derives the case-sensitive repository path
or accepts an explicit base override. **Check MVP** runs validation on pushes/PRs
without deployment. No deployment has been performed during implementation.

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

Updates wait for existing app windows to close; they do not force a reload. App
icons, standalone display, theme metadata, and safe-area spacing are included.
The offline indicator appears when the browser reports no network connection.
Automated checks validate generated cache configuration; actual offline reload and
installed-device behavior still need the manual pass in `docs/RELEASE_CHECKS.md`.
