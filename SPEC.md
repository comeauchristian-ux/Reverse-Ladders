# Reverse Ladders

A small, focused Progressive Web App for performing and tracking reverse-ladder strength training.

The application should remember the user's current progression state for each exercise, guide the user through workouts, automatically handle rest timing, record actual reps performed, and make progression visible over time.

This is intentionally **not** a general-purpose workout tracker.

The central design principle is:

> **The app remembers where I am in each exercise and gets out of the way.**

---

# 1. Technical stack

Build the application using:

- **React**
- **Vite**
- **TypeScript**
- Modern CSS
- IndexedDB for persistent local storage
- A suitable Vite PWA plugin for installable/offline functionality

Do NOT implement this as a simple static HTML/CSS/JavaScript application.

It should be structured as a real React application that remains easy to extend later.

Prefer simplicity and a small dependency footprint.

Do not introduce a large state-management library unless it becomes genuinely necessary.

---

# 2. Core reverse-ladder concept

An exercise has a current progression state written:

`N:T`

Examples:

`9:4`

`9:5`

`9:6`

`9:9`

`10:5`

Where:

- `N` is the total number of sets/rungs in the ladder.
- `T` is the current progression target.

However, **N:T does NOT describe an exact sequence of reps that must be performed.**

This distinction is fundamental to the application.

## Example: 9:5

A `9:5` ladder has 9 total sets.

The progression requirement is represented by the qualifying prefix:

`9 - 8 - 7 - 6 - 5 - 5`

The first sets therefore have minimum targets:

Set 1: 9  
Set 2: 8  
Set 3: 7  
Set 4: 6  
Set 5: 5  
Set 6: 5

After that, the remaining sets do not have a progression-defining minimum.

The user simply performs as many good reps as reasonably possible.

Most importantly:

**The prescribed number is a minimum, not a maximum.**

The user should never have to intentionally stop performing reps merely to make the workout conform to a predefined sequence.

For example, BOTH of these are perfectly valid performances of a `9:5` workout:

`9 - 8 - 7 - 6 - 6 - 5 - 4 - 3 - 2`

and:

`9 - 8 - 7 - 6 - 6 - 5 - 5 - 5 - 5`

The fifth set required at least 5 reps, but performing 6 was fine.

The application must therefore distinguish between:

- **minimum progression targets**
- **actual reps performed**

It should never constrain a set to exactly its minimum target.

---

# 3. Progression logic

The progression algorithm should be implemented separately from the UI as pure TypeScript functions.

For a ladder `N:T`, progression toward the next target gradually raises the duplicated bottom rung.

Conceptually:

`9:4`

requires the progression-defining sequence:

`9 - 8 - 7 - 6 - 5 - 4 - 4`

while:

`9:5`

requires:

`9 - 8 - 7 - 6 - 5 - 5`

and:

`9:6`

requires:

`9 - 8 - 7 - 6 - 6`

and eventually:

`9:9`

requires:

`9 - 9`

The total workout still contains 9 sets in each case.

The sets after the qualifying prefix are still performed and recorded, but they do not determine whether the current progression target was successfully completed.

## Success

A workout is successful if every set belonging to the current progression requirement meets or exceeds its minimum reps.

Extra reps are always allowed.

For example, during `9:5`:

Required:

`9 - 8 - 7 - 6 - 5 - 5`

Actual:

`9 - 8 - 7 - 6 - 6 - 5`

Success.

Actual:

`9 - 8 - 7 - 6 - 5 - 4`

Failure, because the second required 5 was not reached.

Actual:

`10 - 9 - 8 - 7 - 6 - 6`

Success.

The app should evaluate success based on **minimum thresholds**, never exact equality.

## Tail sets

Remaining sets after the qualifying prefix are intentionally flexible.

They should:

- be performed normally
- record actual reps
- contribute to total reps
- contribute to reps/min
- appear in workout history

But poor performance on these unconstrained tail sets should **not** cause the progression attempt to fail.

## Advancement

After successfully completing `N:T`, propose:

`N:(T+1)`

For example:

`9:5 → 9:6`

The user can accept or override this suggestion.

Do not automatically overwrite progression until the workout is completed.

If the progression requirement is not met, keep the same `N:T` for the next session.

## Performance above the current target

Actual performance may happen to satisfy the theoretical requirements of a higher ladder state.

Do not automatically skip progression levels because of this.

For example, someone performing a `9:5` workout might produce enough reps that the session could theoretically satisfy `9:6`.

It should still be recorded as a successful `9:5` workout.

The normal proposed progression remains:

`9:6`

Progression state represents what the user deliberately attempted.

---

# 4. Home screen

The main screen should be extremely simple.

Example:

Reverse Ladders

Pull-ups                         9:5  
Bodyweight

Dips                             9:8  
Bodyweight

Rows                             9:6  
Bodyweight

Push-ups                        10:5  
Bodyweight

Pike Push-ups                    5:4  
Bodyweight

Curls                            6:6  
35 lb

[ + Add exercise ]

Each exercise card should show:

- exercise name
- optional load
- optional variation
- current ladder state
- optionally the date of the most recent workout

Tapping an exercise opens its workout/detail screen.

The home screen should prioritize answering one question:

**Where am I currently at for each exercise?**

---

# 5. Exercise screen

Before beginning a workout, display:

- exercise name
- variation
- load
- current progression state
- number of sets
- rest duration
- progression requirement

Example:

Pull-ups  
Bodyweight

CURRENT LADDER

# 9:5

Progression target:

9 · 8 · 7 · 6 · 5 · 5

9 total sets

Rest: 60 seconds

[ Start Workout ]

Do not visually imply that later sets are prescribed to contain a particular exact number of reps.

---

# 6. Active workout

During a workout show:

- exercise
- current ladder state
- current set number
- minimum required reps, where applicable
- actual reps
- completed sets
- remaining sets
- elapsed workout time

Example:

Pull-ups

9:5

SET 5 OF 9

Minimum: 5

Actual reps:

[-]     6     [+]

[ Complete Set ]

Actual reps should default to the minimum target when a minimum exists.

However, increasing the number should be effortless.

Do not frame reps above the minimum as an error.

For unconstrained tail sets, the UI can simply say:

SET 7 OF 9

Actual reps:

[-]     4     [+]

[ Complete Set ]

There should be no artificial minimum displayed for these sets.

---

# 7. Recording reps

Every set must store:

- set number
- minimum required reps, if any
- actual reps performed
- timestamp when completed

Do not store only whether the set passed or failed.

The actual performance is important for history and statistics.

Example:

```ts
{
  setNumber: 5,
  minimumReps: 5,
  actualReps: 6,
  completedAt: ...
}
```

A tail set may have:

```ts
{
  setNumber: 8,
  minimumReps: null,
  actualReps: 3,
  completedAt: ...
}
```

---

# 8. Rest timer

Immediately after completing every set except the final set, automatically begin the rest timer.

Default:

60 seconds

Allow each exercise to have its own rest duration.

Display:

- large countdown
- circular progress indicator
- prescribed rest duration
- next set number
- next minimum target, if applicable
- Skip Rest button

Example:

REST

0:42

Next:

Set 6 of 9  
Minimum 5 reps

[ Skip Rest ]

The workout timer continues running during rest.

## Timer implementation

Do not rely solely on decrementing a JavaScript counter.

Persist timestamps.

The timer should calculate remaining time from timestamps so that:

- backgrounding the PWA
- locking the iPhone
- switching apps
- temporary browser suspension

does not cause serious timer drift.

When the timer reaches zero, use vibration and/or sound if supported and permitted.

---

# 9. Workout completion

After the ninth set, show a completion screen.

Example:

✓

Workout Complete

Pull-ups

9:5 completed

Total reps: 52  
Duration: 8:14  
Density: 6.3 reps/min

Progression target: PASSED

Next session:

9:6

[ Done ]

[ View History ]

If the progression requirement was missed:

Progression target: NOT COMPLETED

Next session:

9:5

Do not treat low reps during unconstrained tail sets as failure.

---

# 10. Training density

Training density is an important statistic.

Calculate:

`reps/min = total actual reps / total workout duration in minutes`

Workout duration includes:

- working sets
- rest periods
- transitions between sets

It should begin when the workout actually starts.

It should end when the final set is completed.

Do not count time spent looking at the pre-workout screen.

Store raw timestamps and duration seconds so alternative calculations can be added later.

Example:

52 reps

8 minutes 14 seconds

= approximately:

6.3 reps/min

---

# 11. History

Each exercise should have its own history screen.

Show newest sessions first.

Example:

Pull-ups

CURRENT

9:6

HISTORY

12 Aug 2026

9:5 ✓

52 reps  
8:14  
6.3 reps/min

Actual:

9 · 8 · 7 · 6 · 6 · 5 · 5 · 5 · 5

---

5 Aug 2026

9:5

46 reps  
8:31  
5.4 reps/min

Actual:

9 · 8 · 7 · 6 · 5 · 4 · 3 · 2 · 2

Progression requirement missed on set 6.

---

29 Jul 2026

9:4 ✓

...

The actual set sequence should be easily visible.

This is more useful than displaying only a generic "completed" status.

---

# 12. Exercise statistics

History should also contain a compact statistics area.

Useful statistics include:

- total workouts
- successful progression attempts
- total lifetime reps
- average reps per workout
- most recent workout reps
- average workout duration
- average reps/min
- best reps/min
- current ladder state
- highest ladder target attempted
- highest ladder target successfully completed

Avoid filling the application with unrelated gym metrics.

Do NOT add:

- calories burned
- generic readiness scores
- muscle maps
- arbitrary workout scores
- estimated calorie expenditure

unless explicitly added later.

---

# 13. Trends

A small optional statistics/trend view can show useful historical progression.

Potential graphs:

### Total reps over time

Date → total actual reps

### Training density over time

Date → reps/min

### Ladder progression over time

Date → ladder target

Keep graphs simple.

They are secondary to the workout itself.

The application should remain useful without ever opening a graph.

---

# 14. Max-rep tests

Allow max-rep tests to be recorded separately.

Example:

MAX REP TESTS

17 reps  
3 Aug 2026

15 reps  
30 Jul 2026

A max-rep test should store:

- exercise
- date
- reps
- optional load
- optional notes

Max-rep tests should appear in history but should not automatically alter the reverse-ladder progression state.

---

# 15. Exercise settings

Allow exercises to be created and edited.

Fields:

- name
- optional variation
- optional load
- load unit
- ladder size `N`
- current target `T`
- rest duration
- optional notes

Example:

Name:

Pull-ups

Variation:

Pronated grip

Load:

Bodyweight

Ladder:

9:5

Rest:

60 sec

The screen should show a preview of the progression requirement:

For 9:5:

Minimum progression requirement:

9 · 8 · 7 · 6 · 5 · 5

Total sets:

9

Next progression:

9:6

Do not show a fake prescribed tail such as:

9 · 8 · 7 · 6 · 5 · 5 · 4 · 4 · 4

because the tail is intentionally not fixed.

---

# 16. Adding load

Exercises may include load.

Examples:

Pull-ups  
Bodyweight

Weighted Chin-ups  
+25 lb

Bench Press  
155 lb

Curls  
35 lb

Load should be stored independently from ladder progression.

Changing load should not delete previous history.

A historical workout must retain the load that was used at the time.

---

# 17. Data model

Suggested TypeScript models:

```ts
interface Exercise {
  id: string;
  name: string;
  variation?: string;

  load?: number;
  loadUnit?: "lb" | "kg";
  loadType?: "bodyweight" | "added" | "external";

  ladderSize: number;
  target: number;

  restSeconds: number;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

Workout:

```ts
interface Workout {
  id: string;
  exerciseId: string;

  date: string;

  ladderSize: number;
  target: number;

  variation?: string;

  load?: number;
  loadUnit?: "lb" | "kg";

  sets: WorkoutSet[];

  startedAt: string;
  completedAt: string;

  durationSeconds: number;

  totalActualReps: number;

  repsPerMinute: number;

  progressionSuccess: boolean;
}
```

Workout set:

```ts
interface WorkoutSet {
  setNumber: number;

  minimumReps: number | null;

  actualReps: number;

  completedAt: string;
}
```

Max-rep test:

```ts
interface MaxRepTest {
  id: string;
  exerciseId: string;

  date: string;

  reps: number;

  load?: number;
  loadUnit?: "lb" | "kg";

  notes?: string;
}
```

---

# 18. Ladder engine

Create a dedicated module such as:

`src/lib/ladder/`

Potential functions:

```ts
getProgressionMinimums(
  ladderSize: number,
  target: number
): Array<number | null>
```

For:

```ts
getProgressionMinimums(9, 5)
```

the conceptual result should be:

```ts
[9, 8, 7, 6, 5, 5, null, null, null]
```

For:

```ts
getProgressionMinimums(9, 6)
```

the result should be:

```ts
[9, 8, 7, 6, 6, null, null, null, null]
```

For:

```ts
getProgressionMinimums(9, 9)
```

the result should begin:

```ts
[9, 9, null, null, null, null, null, null, null]
```

Also provide:

```ts
didPassProgression(...)
```

which checks ONLY sets with progression minimums.

Actual reps greater than minimum reps always count as successful.

Also provide:

```ts
getNextProgression(...)
```

For example:

```ts
9:5 -> 9:6
```

Keep this logic independent of React.

It should be straightforward to modify later if the progression system evolves.

---

# 19. Tests

Write unit tests for the ladder/progression engine.

At minimum test:

- 9:4
- 9:5
- 9:6
- 9:9
- 10:5
- 6:6

Specifically verify that `9:5` produces:

```ts
[9, 8, 7, 6, 5, 5, null, null, null]
```

Verify that:

```text
9 8 7 6 6 5 4 3 2
```

passes `9:5`.

Verify that:

```text
9 8 7 6 6 5 5 5 5
```

also passes `9:5`.

Verify that:

```text
9 8 7 6 5 4 5 5 5
```

fails `9:5`

because set 6 failed its minimum of 5.

Also verify that tail reps do not affect progression success.

For example:

```text
9 8 7 6 5 5 1 1 1
```

still successfully completes `9:5`.

---

# 20. Persistence

Use IndexedDB or a suitable thin wrapper around IndexedDB.

All exercise and workout data must persist locally.

No login is required.

No backend is required.

No cloud account is required.

The first version should work entirely locally.

Persist:

- exercises
- workouts
- max-rep tests
- current progression
- active workout
- active timer timestamps
- preferences

The architecture should still make future export/sync possible.

---

# 21. Active workout recovery

An interrupted workout must be recoverable.

If the user:

- closes the PWA
- refreshes the page
- switches apps
- locks the phone
- accidentally navigates away

the current workout should remain available.

When reopened, offer:

Continue Workout

or:

Discard Workout

If currently resting, reconstruct the timer based on timestamps.

---

# 22. PWA requirements

Configure the Vite application as a proper installable Progressive Web App.

Requirements:

- manifest
- service worker
- offline application shell
- app icons/placeholders
- standalone display mode
- theme metadata
- background metadata
- offline functionality
- persistent local data
- iPhone safe-area support
- appropriate touch targets

The installed version should feel like an application rather than a website.

---

# 23. GitHub Pages

The project should be easy to deploy using GitHub Pages.

Take GitHub Pages routing and Vite's base-path behavior into account.

The production build should work correctly when hosted from a repository subdirectory such as:

`https://username.github.io/reverse-ladders/`

Avoid routing choices that cause direct navigation or refreshes to produce 404 errors on GitHub Pages.

If React Router is used, configure it appropriately for static hosting, for example with hash-based routing if that provides the simplest robust solution.

---

# 24. Visual design

Use the provided mockup as the primary visual direction.

Desired aesthetic:

- mobile first
- white or light neutral background
- dark typography
- restrained muted green accent
- rounded cards
- large ladder numbers
- generous spacing
- clear typography hierarchy
- subtle borders/shadows
- minimal interface
- polished iOS-like feel

Avoid:

- bodybuilding imagery
- visual clutter
- excessive charts
- gamification
- badges
- points
- streak pressure
- social features
- unnecessary dashboards

---

# 25. Reusable UI components

Create reusable components where useful.

Potential components:

- `ExerciseCard`
- `LadderBadge`
- `ProgressionPreview`
- `SetCounter`
- `RepControl`
- `RestTimer`
- `WorkoutSummary`
- `HistoryEntry`
- `StatsCard`
- `MaxRepEntry`

Avoid excessive abstraction for very small pieces of UI.

---

# 26. Suggested project structure

A reasonable structure might be:

```text
src/
  components/
  pages/
  hooks/

  lib/
    ladder/
    storage/
    stats/

  types/

  App.tsx
  main.tsx

tests/

public/

docs/
  mockup.png
```

Keep:

- progression logic
- storage
- statistics
- workout logic
- presentation

reasonably separated.

---

# 27. Statistics implementation

Implement statistics from recorded raw data rather than storing unnecessary derived values whenever practical.

For example:

### Total reps

```text
sum(all actual reps)
```

### Session density

```text
actual session reps / session duration in minutes
```

### Average density

Prefer averaging session densities unless another definition is explicitly chosen later.

### Best density

Highest recorded session reps/min.

Preserve the underlying raw data so calculation methods can be changed later.

---

# 28. Exercise history philosophy

History exists primarily to answer:

- Am I progressing?
- How many reps did I actually do?
- Am I doing more work?
- Am I doing the work faster?
- What ladder was I attempting?
- Did I successfully advance?

It should not become a generic fitness analytics dashboard.

---

# 29. Future possibilities

Do not implement these initially, but keep the architecture flexible enough for possibilities such as:

- configurable progression rules
- weighted progression
- shortening rest as a progression method
- longer rest as a temporary adjustment
- export/import JSON
- backup
- cloud sync
- multiple devices
- comparison between load, reps, and density
- charts
- workout notes
- exercise ordering/workout templates

These are future possibilities, not MVP requirements.

---

# 30. MVP

The first polished MVP should contain:

1. React + Vite + TypeScript project
2. Installable PWA
3. Offline functionality
4. Exercise list
5. Add/edit/delete exercise
6. Reverse-ladder progression engine
7. Correct `N:T` semantics
8. Guided workout
9. Actual rep recording
10. Extra reps freely allowed
11. Flexible unconstrained tail sets
12. Automatic rest timer
13. Accurate timestamp-based timing
14. Success/failure detection
15. Suggested progression
16. Workout completion summary
17. Total reps
18. Reps/min
19. Workout history
20. Exercise statistics
21. Max-rep test recording
22. IndexedDB persistence
23. Interrupted workout recovery
24. GitHub Pages compatibility
25. Unit tests
26. Production build with no TypeScript/build errors

---

# 31. Development workflow

Before implementing substantial changes:

1. Read this specification.
2. Inspect the existing project.
3. Make a short implementation plan.
4. Implement one coherent milestone at a time.
5. Run tests.
6. Run the production build.
7. Fix any errors before considering the milestone complete.

Do not add unrelated features simply because they are common in fitness applications.

When requirements are ambiguous, favor the simplest implementation consistent with the core reverse-ladder concept.

---

# 32. Final product philosophy

Reverse Ladders should feel less like logging a workout and more like having a tiny application that remembers the progression for you.

The experience should essentially be:

**Open app → see where I am → train → record what I actually did → rest → finish → know what to attempt next.**

The application should never encourage the user to artificially limit reps merely because a theoretical sequence predicted fewer reps.

The ladder defines **minimum progression requirements**.

Actual performance remains free.