import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { afterEach, beforeEach, it } from 'node:test'
import { deleteDB } from 'idb'
import { openDatabase } from '../src/lib/storage/database.ts'
import { exerciseRepository, normalizeExercise, snapshotExercise } from '../src/lib/storage/exercises.ts'
import type { ExerciseInput, Workout } from '../src/types/domain.ts'

const input: ExerciseInput = { name: ' Pull-ups ', variation: ' Pronated ', loadType: 'added', load: 25, loadUnit: 'lb', ladderSize: 9, target: 5, restSeconds: 60, notes: ' Good form ' }
let name: string
let db: Awaited<ReturnType<typeof openDatabase>>
beforeEach(async () => { name = crypto.randomUUID(); db = await openDatabase(name) })
afterEach(async () => { db.close(); await deleteDB(name) })

it('creates every version 1 store and persists exercise fields across reopen', async () => {
  assert.deepEqual([...db.objectStoreNames], ['activeWorkout', 'exercises', 'maxRepTests', 'preferences', 'workouts'])
  const saved = await exerciseRepository(db).create(input)
  assert.equal(saved.name, 'Pull-ups')
  assert.equal(saved.variation, 'Pronated')
  assert.equal(saved.notes, 'Good form')
  db.close()
  db = await openDatabase(name)
  assert.deepEqual(await exerciseRepository(db).get(saved.id), saved)
  assert.deepEqual(await exerciseRepository(db).list(), [saved])
})

it('updates settings and removes stale numeric load when switching to bodyweight', async () => {
  const repo = exerciseRepository(db)
  const saved = await repo.create(input)
  const updated = await repo.update(saved, { ...input, name: 'Chin-ups', loadType: 'bodyweight', target: 6, restSeconds: 90 })
  assert.equal(updated.load, undefined)
  assert.equal(updated.loadUnit, undefined)
  assert.equal(updated.createdAt, saved.createdAt)
  assert.equal(updated.revision, 2)
  assert.equal(updated.target, 6)
  assert.equal(updated.restSeconds, 90)
  assert.equal((await repo.get(saved.id))?.name, 'Chin-ups')
})

it('preserves workout snapshots and history when an exercise is edited and deleted', async () => {
  const repo = exerciseRepository(db)
  const saved = await repo.create(input)
  const snapshot = snapshotExercise(saved)
  const workout: Workout = { ...snapshot, id: crypto.randomUUID(), date: saved.createdAt, startedAt: saved.createdAt, completedAt: saved.createdAt, durationSeconds: 60, totalActualReps: 9, repsPerMinute: 9, progressionSuccess: false, sets: [{ setNumber: 1, minimumReps: 9, actualReps: 9, completedAt: saved.createdAt }] }
  await db.add('workouts', workout)
  const updated = await repo.update(saved, { ...input, name: 'Changed', load: 50, loadUnit: 'kg', loadType: 'external', variation: 'Neutral', restSeconds: 120, target: 6 })
  await repo.remove(updated)
  assert.deepEqual(await db.get('workouts', workout.id), workout)
  assert.equal(snapshot.load, 25)
  assert.equal(snapshot.loadType, 'added')
  assert.equal(snapshot.target, 5)
  assert.equal(snapshot.restSeconds, 60)
  assert.equal(await repo.get(saved.id), undefined)
  assert.deepEqual(await repo.list(), [])
  assert.ok((await db.get('exercises', saved.id))?.deletedAt)
  assert.deepEqual(await db.getAllFromIndex('workouts', 'exerciseId', saved.id), [workout])
})

it('rejects stale edits and deletes without losing the newer data', async () => {
  const repo = exerciseRepository(db)
  const saved = await repo.create(input)
  const updated = await repo.update(saved, { ...input, target: 6 })
  await assert.rejects(repo.update(saved, input), /another window/)
  await assert.rejects(repo.remove(saved), /another window/)
  assert.deepEqual(await repo.get(saved.id), updated)
  await repo.remove(updated)
  await assert.rejects(repo.update(updated, input), /another window/)
})

it('persists active timer timestamps, preferences and max-rep tests across reopen', async () => {
  const saved = await exerciseRepository(db).create(input)
  const active = { ...snapshotExercise(saved), id: crypto.randomUUID(), startedAt: saved.createdAt, phase: 'resting' as const, sets: [], restStartedAt: saved.createdAt, restEndsAt: new Date(Date.now() + 60000).toISOString() }
  const preferences = { soundEnabled: false, vibrationEnabled: true }
  const test = { id: crypto.randomUUID(), exerciseId: saved.id, date: saved.createdAt, reps: 17, loadType: 'bodyweight' as const }
  await db.put('activeWorkout', active, 'current')
  await db.put('preferences', preferences, 'user')
  await db.add('maxRepTests', test)
  await assert.rejects(exerciseRepository(db).remove(saved), /active workout/)
  db.close()
  db = await openDatabase(name)
  assert.deepEqual(await db.get('activeWorkout', 'current'), active)
  assert.deepEqual(await db.get('preferences', 'user'), preferences)
  assert.deepEqual(await db.getAllFromIndex('maxRepTests', 'exerciseId', saved.id), [test])
})

it('rejects invalid exercises before writing anything', async () => {
  const invalid: Partial<ExerciseInput>[] = [
    { name: ' ' }, { target: 1 }, { target: 10 }, { ladderSize: 1 },
    { restSeconds: -1 }, { restSeconds: 1.5 }, { restSeconds: NaN },
    { load: undefined }, { load: -1 }, { load: Infinity }, { loadUnit: undefined },
  ]
  for (const fields of invalid) await assert.rejects(exerciseRepository(db).create({ ...input, ...fields }))
  assert.deepEqual(await exerciseRepository(db).list(), [])
  assert.equal(normalizeExercise({ ...input, load: 2.5 }).load, 2.5)
  assert.equal(normalizeExercise({ ...input, restSeconds: 0 }).restSeconds, 0)
})
