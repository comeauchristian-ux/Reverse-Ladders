import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { afterEach, beforeEach, it } from 'node:test'
import { deleteDB } from 'idb'
import { openDatabase } from '../src/lib/storage/database.ts'
import { exerciseRepository } from '../src/lib/storage/exercises.ts'
import { workoutRepository } from '../src/lib/storage/workouts.ts'
import { completeSet, completedWorkout, currentMinimum, defaultReps, elapsedSeconds, finishRest, remainingRest, startWorkout } from '../src/lib/workout/index.ts'
import type { ActiveWorkout, ExerciseSnapshot } from '../src/types/domain.ts'

const time = Date.parse('2026-09-17T12:00:00Z')
const snapshot: ExerciseSnapshot = { exerciseId: 'example', name: 'Pull-ups', loadType: 'bodyweight', ladderSize: 9, target: 5, restSeconds: 60 }
const fresh = () => startWorkout(snapshot, 'session', time)

it('starts working with no pre-workout time and defaults reps to the minimum', () => {
  const workout = fresh()
  assert.equal(workout.phase, 'working')
  assert.equal(elapsedSeconds(workout, time), 0)
  assert.equal(defaultReps(workout), 9)
  assert.equal(workout.restEndsAt, null)
})

it('records extra reps and a timestamp before automatically resting', () => {
  const original = fresh()
  const next = completeSet(original, 11, time + 10000)
  assert.equal(original.sets.length, 0)
  assert.deepEqual(next.sets[0], { setNumber: 1, minimumReps: 9, actualReps: 11, completedAt: new Date(time + 10000).toISOString() })
  assert.equal(next.phase, 'resting')
  assert.equal(next.restEndsAt, new Date(time + 70000).toISOString())
  assert.equal(defaultReps(next), 8)
  assert.throws(() => completeSet(next, 8, time + 11000), /not ready/)
})

it('reconstructs countdown and elapsed time after suspension without timer ticks', () => {
  const resting = completeSet(fresh(), 9, time + 10000)
  assert.equal(remainingRest(resting, time + 27500), 43)
  assert.equal(remainingRest(resting, time + 70000), 0)
  assert.equal(remainingRest(resting, time + 500000), 0)
  assert.equal(elapsedSeconds(resting, time + 500000), 500)
  assert.throws(() => finishRest(resting, time + 20000), /still running/)
  const recovered = finishRest(resting, time + 500000)
  assert.equal(recovered.phase, 'working')
  assert.equal(recovered.sets.length, 1)
  assert.equal(recovered.restEndsAt, null)
})

it('supports skipping rest and zero-second rests', () => {
  const resting = completeSet(fresh(), 9, time + 10000)
  assert.equal(finishRest(resting, time + 20000, true).phase, 'working')
  const noRest = completeSet({ ...fresh(), restSeconds: 0 }, 9, time + 10000)
  assert.equal(noRest.phase, 'working')
  assert.equal(noRest.restEndsAt, null)
})

it('records unconstrained tails, completes all sets, and freezes duration at the final set', () => {
  let workout: ActiveWorkout = { ...fresh(), restSeconds: 0 }
  const reps = [9, 8, 7, 6, 6, 5, 0, 1, 0]
  reps.forEach((count, index) => {
    if (index === 6) {
      assert.equal(currentMinimum(workout), null)
      assert.equal(defaultReps(workout), 5)
    }
    workout = completeSet(workout, count, time + (index + 1) * 10000)
  })
  assert.equal(workout.phase, 'completed')
  assert.equal(workout.restEndsAt, null)
  assert.equal(workout.sets[6].minimumReps, null)
  assert.equal(elapsedSeconds(workout, time + 999999), 90)
  const record = completedWorkout(workout)
  assert.equal(record.durationSeconds, 90)
  assert.equal(record.totalActualReps, 42)
  assert.equal(record.repsPerMinute, 28)
  assert.equal(record.progressionSuccess, true)
  assert.throws(() => completeSet(workout, 5, time + 999999), /not ready/)
})

it('rejects invalid reps, premature completion, and backwards time', () => {
  for (const count of [-1, NaN, Infinity, 1.5]) assert.throws(() => completeSet(fresh(), count, time + 1000))
  assert.throws(() => completeSet(fresh(), 9, time - 1), /clock/)
  assert.throws(() => completedWorkout(fresh()), /every set/)
})

let name: string
let db: Awaited<ReturnType<typeof openDatabase>>
beforeEach(async () => { name = crypto.randomUUID(); db = await openDatabase(name) })
afterEach(async () => { db.close(); await deleteDB(name) })

it('recovers a resting workout and its original exercise snapshot after reopening', async () => {
  const exercise = await exerciseRepository(db).create(snapshot)
  let repo = workoutRepository(db)
  const started = await repo.start(exercise.id, time)
  const resting = await repo.complete(started, 10, time + 10000)
  await exerciseRepository(db).update(exercise, { ...exercise, target: 6, restSeconds: 120 })
  db.close()
  db = await openDatabase(name)
  repo = workoutRepository(db)
  assert.deepEqual(await repo.get(), resting)
  assert.equal((await repo.get())?.target, 5)
  const resumed = await repo.rest((await repo.get())!, false, time + 300000)
  assert.equal(resumed?.phase, 'working')
  assert.equal(resumed?.restSeconds, 60)
})

it('serializes concurrent starts and prevents duplicate/stale set writes even with no rest', async () => {
  const exercise = await exerciseRepository(db).create({ ...snapshot, restSeconds: 0 })
  const repo = workoutRepository(db)
  const starts = await Promise.allSettled([repo.start(exercise.id, time), repo.start(exercise.id, time)])
  assert.equal(starts.filter((result) => result.status === 'fulfilled').length, 1)
  const started = (await repo.get())!
  const writes = await Promise.allSettled([repo.complete(started, 9, time + 1000), repo.complete(started, 9, time + 1000)])
  assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal((await repo.get())?.sets.length, 1)
  await assert.rejects(repo.dismiss(started), /another window/)
})

it('archives the final set exactly once and clearing completion keeps history and progression', async () => {
  const exercise = await exerciseRepository(db).create({ ...snapshot, ladderSize: 2, target: 2, restSeconds: 0 })
  const repo = workoutRepository(db)
  const started = await repo.start(exercise.id, time)
  const second = (await repo.complete(started, 3, time + 10000))!
  const completed = (await repo.complete(second, 2, time + 20000))!
  await assert.rejects(repo.complete(second, 2, time + 20000), /another window/)
  assert.equal((await db.getAll('workouts')).length, 1)
  assert.equal((await db.get('workouts', completed.id))?.durationSeconds, 20)
  db.close()
  db = await openDatabase(name)
  const reopened = workoutRepository(db)
  assert.equal((await reopened.get())?.phase, 'completed')
  await reopened.dismiss(completed)
  assert.equal(await reopened.get(), null)
  assert.equal((await db.getAll('workouts')).length, 1)
  assert.deepEqual(await exerciseRepository(db).get(exercise.id), exercise)
})

it('discarding an unfinished workout frees the active slot without adding history', async () => {
  const exercise = await exerciseRepository(db).create(snapshot)
  const repo = workoutRepository(db)
  const started = await repo.start(exercise.id, time)
  await repo.dismiss(started)
  assert.equal(await repo.get(), null)
  assert.deepEqual(await db.getAll('workouts'), [])
  const replacement = await repo.start(exercise.id, time + 10000)
  await assert.rejects(repo.dismiss(started), /another window/)
  assert.equal((await repo.get())?.id, replacement.id)
})

it('invalid transitions do not alter the stored session', async () => {
  const exercise = await exerciseRepository(db).create(snapshot)
  const repo = workoutRepository(db)
  const started = await repo.start(exercise.id, time)
  await assert.rejects(repo.complete(started, -1, time + 1000))
  assert.deepEqual(await repo.get(), started)
})

it('rolls back the final set if saving the completed record fails', async () => {
  const exercise = await exerciseRepository(db).create({ ...snapshot, ladderSize: 2, target: 2, restSeconds: 0 })
  const repo = workoutRepository(db)
  const started = await repo.start(exercise.id, time)
  const second = (await repo.complete(started, 2, time + 10000))!
  const failingDb = new Proxy(db, {
    get(target, property) {
      if (property !== 'transaction') return Reflect.get(target, property, target)
      return () => {
        const tx = target.transaction(['activeWorkout', 'workouts'], 'readwrite')
        return new Proxy(tx, {
          get(transaction, key) {
            if (key === 'objectStore') return (store: 'activeWorkout' | 'workouts') => {
              if (store === 'workouts') throw new Error('Simulated storage failure')
              return transaction.objectStore(store)
            }
            const value = Reflect.get(transaction, key, transaction)
            return typeof value === 'function' ? value.bind(transaction) : value
          },
        })
      }
    },
  })
  await assert.rejects(workoutRepository(failingDb).complete(second, 2, time + 20000), /storage failure/)
  assert.deepEqual(await repo.get(), second)
  assert.equal((await db.getAll('workouts')).length, 0)
  await repo.complete(second, 2, time + 20000)
  assert.equal((await db.getAll('workouts')).length, 1)
})
