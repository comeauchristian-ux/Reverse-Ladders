import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { afterEach, beforeEach, it } from 'node:test'
import { deleteDB } from 'idb'
import { openDatabase } from '../src/lib/storage/database.ts'
import { exerciseRepository } from '../src/lib/storage/exercises.ts'
import { workoutRepository } from '../src/lib/storage/workouts.ts'
import { historyRepository, validateMaxRep } from '../src/lib/storage/history.ts'
import { exerciseStats, sessionStats } from '../src/lib/stats/index.ts'
import { completeSet, completedWorkout, startWorkout } from '../src/lib/workout/index.ts'
import { getNextProgression } from '../src/lib/ladder/index.ts'
import type { Workout } from '../src/types/domain.ts'

const time = Date.parse('2026-09-17T12:00:00Z')
function session(reps = [9, 8, 7, 6, 6, 5, 0, 1, 0], duration = 90, date = time): Workout {
  let active = startWorkout({ exerciseId: 'test', name: 'Pull-ups', loadType: 'bodyweight', ladderSize: 9, target: 5, restSeconds: 0 }, crypto.randomUUID(), date)
  reps.forEach((reps, i) => { active = completeSet(active, reps, date + duration * 1000 * (i + 1) / 9) })
  return completedWorkout(active)
}

it('derives summary metrics and missed sets from raw performance', () => {
  const workout = session()
  const metrics = sessionStats({ ...workout, totalActualReps: 999, durationSeconds: 999, repsPerMinute: 999, progressionSuccess: false })
  assert.deepEqual(metrics, { totalReps: 42, durationSeconds: 90, density: 28, passed: true, missedSets: [] })
  const failed = session([9, 8, 7, 6, 5, 4, 5, 5, 5])
  assert.deepEqual(sessionStats(failed).missedSets, [6])
  assert.equal(sessionStats(failed).passed, false)
  assert.deepEqual(getNextProgression(9, 5, sessionStats(failed).passed), { ladderSize: 9, target: 5 })
})

it('averages session densities rather than combining durations and handles empty/zero-duration history', () => {
  const first = session(undefined, 60, time)
  const second = session(undefined, 180, time + 86400000)
  const result = exerciseStats([first, second])
  assert.equal(result.totalWorkouts, 2)
  assert.equal(result.successfulAttempts, 2)
  assert.equal(result.totalReps, 84)
  assert.equal(result.averageReps, 42)
  assert.equal(result.averageDuration, 120)
  assert.equal(result.averageDensity, 28)
  assert.equal(result.bestDensity, 42)
  assert.equal(result.latestReps, 42)
  assert.equal(exerciseStats([]).averageDensity, null)
  assert.equal(exerciseStats([]).highestAttempted, null)
  const zero = session(undefined, 0)
  assert.equal(sessionStats(zero).density, null)
  assert.equal(exerciseStats([zero, first]).averageDensity, 42)
})

it('orders highest ladders by size then target and distinguishes attempts from passes', () => {
  const passed = session()
  const failed = { ...session([0, 0, 0, 0, 0, 0, 0, 0, 0]), target: 9 }
  const stats = exerciseStats([failed, passed])
  assert.deepEqual(stats.highestAttempted, { ladderSize: 9, target: 9 })
  assert.deepEqual(stats.highestPassed, { ladderSize: 9, target: 5 })
  assert.equal(stats.successfulAttempts, 1)
  assert.equal(sessionStats({ ...passed, sets: [...passed.sets].reverse() }).passed, true)
})

let name: string
let db: Awaited<ReturnType<typeof openDatabase>>
beforeEach(async () => { name = crypto.randomUUID(); db = await openDatabase(name) })
afterEach(async () => { db.close(); await deleteDB(name) })

async function finishWorkout() {
  const exercise = await exerciseRepository(db).create({ name: 'Curls', loadType: 'external', load: 35, loadUnit: 'lb', ladderSize: 3, target: 2, restSeconds: 0 })
  const repo = workoutRepository(db)
  const first = await repo.start(exercise.id, time)
  const second = (await repo.complete(first, 3, time + 10000))!
  const third = (await repo.complete(second, 2, time + 20000))!
  const completed = (await repo.complete(third, 2, time + 30000))!
  return { exercise, completed }
}

it('accepts progression once, preserves attempted state and load, and survives reopen', async () => {
  const { exercise, completed } = await finishWorkout()
  const repo = historyRepository(db)
  assert.equal((await db.get('exercises', exercise.id))?.target, 2)
  await Promise.all([repo.finalize(completed.id, { ladderSize: 3, target: 3 }, exercise.revision), repo.finalize(completed.id, { ladderSize: 3, target: 3 }, exercise.revision)])
  const changed = (await db.get('exercises', exercise.id))!
  assert.equal(changed.target, 3)
  assert.equal(changed.revision, exercise.revision + 1)
  assert.equal(await workoutRepository(db).get(), null)
  db.close(); db = await openDatabase(name)
  const history = await historyRepository(db).get(exercise.id)
  assert.equal(history.workouts.length, 1)
  assert.equal(history.workouts[0].target, 2)
  assert.equal(history.workouts[0].load, 35)
  assert.deepEqual(history.workouts[0].progressionDecision?.next, { ladderSize: 3, target: 3 })
  const newer = await workoutRepository(db).start(exercise.id, time + 60000)
  await historyRepository(db).finalize(completed.id, { ladderSize: 4, target: 2 }, changed.revision)
  assert.equal((await workoutRepository(db).get())?.id, newer.id)
  assert.equal((await db.get('exercises', exercise.id))?.revision, changed.revision)
})

it('allows explicit overrides and rejects invalid ladders without clearing completion', async () => {
  const { exercise, completed } = await finishWorkout()
  const repo = historyRepository(db)
  await assert.rejects(repo.finalize(completed.id, { ladderSize: 3, target: 4 }, exercise.revision))
  assert.equal((await workoutRepository(db).get())?.id, completed.id)
  assert.equal((await db.get('workouts', completed.id))?.progressionDecision, undefined)
  await repo.finalize(completed.id, { ladderSize: 5, target: 2 }, exercise.revision)
  assert.equal((await db.get('exercises', exercise.id))?.ladderSize, 5)
})

it('does not overwrite newer exercise edits and can finish while keeping settings', async () => {
  const { exercise, completed } = await finishWorkout()
  const changed = await exerciseRepository(db).update(exercise, { ...exercise, load: 40, target: 3 })
  await assert.rejects(historyRepository(db).finalize(completed.id, { ladderSize: 3, target: 2 }, exercise.revision), /another window/)
  assert.deepEqual(await db.get('exercises', exercise.id), changed)
  assert.equal((await db.get('workouts', completed.id))?.progressionDecision, undefined)
  await historyRepository(db).finalize(completed.id, null)
  assert.deepEqual(await db.get('exercises', exercise.id), changed)
  assert.equal((await db.get('workouts', completed.id))?.progressionDecision?.next, null)
})

it('records max-rep tests independently, validates fields, and safely retries the same record', async () => {
  const { exercise } = await finishWorkout()
  const repo = historyRepository(db)
  const input = { date: '2026-09-16', reps: 17, loadType: 'added' as const, load: 2.5, loadUnit: 'kg' as const, notes: ' Good reps ' }
  const saved = await repo.addMaxRep(exercise.id, input, 'retry-key')
  assert.deepEqual(await repo.addMaxRep(exercise.id, input, 'retry-key'), saved)
  await assert.rejects(repo.addMaxRep(exercise.id, { ...input, reps: 18 }, 'retry-key'), /different values/)
  assert.equal(saved.notes, 'Good reps')
  assert.equal((await repo.get(exercise.id)).maxRepTests.length, 1)
  assert.equal((await repo.get(exercise.id)).workouts.length, 1)
  assert.deepEqual(await db.get('exercises', exercise.id), exercise)
  for (const fields of [{ date: '2026-02-30' }, { date: 'wrong' }, { reps: -1 }, { reps: 2.5 }, { reps: NaN }, { load: -1 }, { load: Infinity }, { loadUnit: undefined }]) {
    assert.throws(() => validateMaxRep({ ...input, ...fields }))
  }
  assert.equal(validateMaxRep({ ...input, loadType: 'bodyweight' }).load, undefined)
})

it('returns newest sessions first, excludes other exercises, and preserves deleted history', async () => {
  const { exercise, completed } = await finishWorkout()
  await historyRepository(db).finalize(completed.id, null)
  const older = { ...(await db.get('workouts', completed.id))!, id: 'older', startedAt: new Date(time - 86400000).toISOString() }
  await db.add('workouts', older)
  await db.add('workouts', { ...older, id: 'unrelated', exerciseId: 'other' })
  const repo = historyRepository(db)
  await repo.addMaxRep(exercise.id, { date: '2026-09-15', reps: 10, loadType: 'bodyweight' })
  await repo.addMaxRep(exercise.id, { date: '2026-09-16', reps: 11, loadType: 'bodyweight' })
  await exerciseRepository(db).remove(exercise)
  const data = await repo.get(exercise.id)
  assert.deepEqual(data.workouts.map((item) => item.id), [completed.id, 'older'])
  assert.deepEqual(data.maxRepTests.map((item) => item.reps), [11, 10])
  assert.ok(data.exercise?.deletedAt)
})

it('rolls back progression and decision together if active-slot cleanup fails', async () => {
  const { exercise, completed } = await finishWorkout()
  const failingDb = new Proxy(db, {
    get(target, property) {
      if (property !== 'transaction') return Reflect.get(target, property, target)
      return () => {
        const tx = target.transaction(['workouts', 'exercises', 'activeWorkout'], 'readwrite')
        return new Proxy(tx, {
          get(transaction, key) {
            if (key === 'objectStore') return (store: 'workouts' | 'exercises' | 'activeWorkout') => {
              const actual = transaction.objectStore(store)
              return new Proxy(actual, { get(object, field) {
                if (store === 'activeWorkout' && field === 'delete') return () => { throw new Error('Simulated cleanup failure') }
                const value = Reflect.get(object, field, object)
                return typeof value === 'function' ? value.bind(object) : value
              } })
            }
            const value = Reflect.get(transaction, key, transaction)
            return typeof value === 'function' ? value.bind(transaction) : value
          },
        })
      }
    },
  })
  await assert.rejects(historyRepository(failingDb).finalize(completed.id, { ladderSize: 3, target: 3 }, exercise.revision), /cleanup failure/)
  assert.deepEqual(await db.get('exercises', exercise.id), exercise)
  assert.equal((await db.get('workouts', completed.id))?.progressionDecision, undefined)
  assert.equal((await workoutRepository(db).get())?.id, completed.id)
})
