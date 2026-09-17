# MVP release verification

## Automated checks

Run `npm run check` (`npm.cmd run check` in restricted Windows PowerShell).
The command runs domain/storage tests, TypeScript checks, and two production builds:

- Root hosting at `/`, output in `dist/`.
- Case-sensitive repository hosting at `/Reverse-Ladders/`, output in
  `.release-check/repository/` (ignored by Git).

For each build it verifies manifest start URL/scope/ID, standalone mode, theme
metadata, real PNG icon dimensions, local asset references, service-worker scope,
navigation fallback, and precache coverage. It evaluates the generated worker
against a small Workbox observer to assert updates do not activate immediately.
It also starts a local preview, fetches the shell and assets (including hash URLs),
checks HTTP responses, then shuts the server down.

This is **artifact and HTTP validation**, not browser execution. It does not prove
React rendering, actual browser cache installation, touch behavior, or accessibility.
Unit/integration tests use fake IndexedDB and cover interrupted workouts, expired
rest recovery, exact-once set saves, completion/progression rollback, and history
preservation. They do not substitute for device storage tests.

## Recorded result — 17 September 2026

- 79 domain and storage tests passed.
- TypeScript checks passed.
- Root and repository production builds and artifact/HTTP checks passed.
- UI styling reviewed against the supplied mockup in source; no rendered comparison.
- Browser/device tests below remain **not run**: this environment exposes no browser
  or native application for interactive testing.
- GitHub workflows are checked in but have not run remotely. No site was published.

## Browser/device acceptance pass

Use a production preview or HTTPS deployment, not the development server (which
does not install the service worker). Use a disposable test exercise; preserve any
existing user data. Record device, browser version, build, date, and result for each
check. Test iPhone Safari/installed PWA plus one desktop browser.

1. **Layout and input:** Check 320, 375, 390, and 768 px widths, landscape, and
   enlarged text. Visit home, add/edit, exercise, working set, rest, completion,
   history/stats, and max-rep form. Verify no horizontal overflow, clipped controls,
   keyboard-covered save controls, or notch/home-indicator overlap. Long names,
   notes, and validation errors must wrap. Keyboard focus must be visible, follow
   route changes, and reach every button/input. Screen readers should announce set
   changes and completion without reading the timer every quarter second.
2. **Exercise management:** Create a 9:5 bodyweight exercise with 60-second rest.
   Refresh and verify it persists. Edit load/variation and confirm history snapshots
   remain unchanged. Try blank names, fractional targets, and T greater than N.
   Double-tapping Save should create only one exercise.
3. **Successful workout:** Record `9,8,7,6,6,5,0,0,0`, skipping rest where useful.
   Set 7 onward must have no minimum. Verify 41 total reps, PASSED, a 9:6 suggestion,
   and the exact actual sequence in history. Done should change progression once.
4. **Missed target:** Attempt 9:5 again with `9,8,7,6,5,4,5,5,5`. Verify set 6 is
   identified, the target is NOT COMPLETED, and the suggestion stays 9:5. Test
   manually overriding a suggestion and keeping settings unchanged.
5. **Recovery/timers:** Complete a set, note the deadline, then refresh, navigate
   away, lock the phone, and close/reopen the app in separate attempts. Continue
   should retain saved sets and reconstruct the countdown; expired rest must
   advance once, not repeat a set. Elapsed time includes time away and stops at the
   final set. Discard requires confirmation. Starting another exercise must not
   replace an active workout. Test zero rest and manually skipped rest.
6. **Offline:** Visit online and wait for the worker to install/control the page.
   Reload once, disconnect networking, then reopen a hash route. Create/edit an
   exercise, complete a workout, and record a max-rep test offline. Reload and
   verify all records remain. Reconnect; no data should disappear.
7. **Installation:** Install from Safari's Share → Add to Home Screen (or the
   browser's install action). Verify name/icon, standalone display, safe-area
   spacing, and offline reopening. Test optional sound/vibration where supported;
   blocked background alerts must not affect the timestamp-based timer.
8. **Update safety:** With a workout active, publish a changed build to a test
   deployment and trigger the browser's worker update check. The new worker should
   wait without interrupting the workout. Close all tabs/installed windows for the
   app, reopen, and verify the new build plus recoverable existing data. Do not use
   “skip waiting” in DevTools when validating this behavior.
9. **History and statistics:** Check empty history, all-failed sessions, zero-duration
   sessions (density unavailable), multiple loads, and max tests on dates near
   midnight. Max tests must not alter progression or workout statistics. Test a
   second tab changing the exercise before accepting progression: the stale choice
   must be rejected or explicitly kept unchanged.
10. **Pages routing:** On the actual repository URL, directly open and refresh
    `#/workout`, an exercise history route, and an unknown route. Assets must load
    from the repository path; unknown routes must offer a way home.

## Deployment

Select **GitHub Actions** under repository Settings → Pages. Run the manual
**Deploy to GitHub Pages** workflow from the Actions tab. The workflow runs all
checks, derives the exact repository base path, builds and verifies the final
artifact, then publishes it. For a custom domain, enter `/` as the base override.
The separate **Check MVP** workflow runs on pushes and pull requests without
publishing. The Pages workflow does not publish on push.

For local subdirectory preview, set `VITE_BASE_PATH=/Reverse-Ladders/` in `.env.local`,
then run `npm run build` and `npm run preview`. Open the displayed repository URL.
`npm run check` deliberately overrides the base only in its child process; its
root `dist/` is a test artifact. Rebuild with your deployment base before publishing.

References: [Vite static deployment](https://vite.dev/guide/static-deploy.html#github-pages),
[GitHub Pages deployment action](https://github.com/actions/deploy-pages).
