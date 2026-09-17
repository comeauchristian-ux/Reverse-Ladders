import type { IDBPDatabase } from 'idb'
import type { Exercise, ExerciseInput, ExerciseSnapshot } from '../../types/domain.ts'
import type { LadderDatabase } from './database.ts'
import { getNextProgression } from '../ladder/index.ts'

export function normalizeExercise(input: ExerciseInput): ExerciseInput {
  const name = input.name.trim()
  if (!name) throw new Error('Enter an exercise name.')
  getNextProgression(input.ladderSize, input.target)
  if (!Number.isSafeInteger(input.restSeconds) || input.restSeconds < 0) {
    throw new Error('Rest must be a whole number of seconds, zero or greater.')
  }
  if (!['bodyweight', 'added', 'external'].includes(input.loadType)) throw new Error('Choose a load type.')
  if (input.loadType !== 'bodyweight') {
    if (input.load === undefined || !Number.isFinite(input.load) || input.load < 0) {
      throw new Error('Enter a load of zero or greater.')
    }
    if (input.loadUnit !== 'lb' && input.loadUnit !== 'kg') throw new Error('Choose lb or kg.')
  }
  return {
    name, variation: input.variation?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    ladderSize: input.ladderSize, target: input.target, restSeconds: input.restSeconds,
    loadType: input.loadType,
    load: input.loadType === 'bodyweight' ? undefined : input.load,
    loadUnit: input.loadType === 'bodyweight' ? undefined : input.loadUnit,
  }
}

export function snapshotExercise(exercise: Exercise): ExerciseSnapshot {
  const { name, variation, loadType, load, loadUnit, ladderSize, target, restSeconds } = exercise
  return { exerciseId: exercise.id, name, variation, loadType, load, loadUnit, ladderSize, target, restSeconds }
}

export function exerciseRepository(db: IDBPDatabase<LadderDatabase>) {
  return {
    async list() {
      return (await db.getAll('exercises')).filter((item) => !item.deletedAt)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    },
    async get(id: string) {
      const exercise = await db.get('exercises', id)
      return exercise?.deletedAt ? undefined : exercise
    },
    async create(input: ExerciseInput) {
      const fields = normalizeExercise(input)
      const now = new Date().toISOString()
      const exercise: Exercise = { ...fields, id: crypto.randomUUID(), createdAt: now, updatedAt: now, revision: 1 }
      await db.add('exercises', exercise)
      return exercise
    },
    async update(original: Exercise, input: ExerciseInput) {
      const fields = normalizeExercise(input)
      const tx = db.transaction('exercises', 'readwrite')
      const current = await tx.store.get(original.id)
      if (!current || current.deletedAt || current.revision !== original.revision) {
        throw new Error('This exercise changed in another window. Reload before editing again.')
      }
      const exercise = { ...current, ...fields, updatedAt: new Date().toISOString(), revision: current.revision + 1 }
      await tx.store.put(exercise)
      await tx.done
      return exercise
    },
    async remove(original: Exercise) {
      const tx = db.transaction(['exercises', 'activeWorkout'], 'readwrite')
      const current = await tx.objectStore('exercises').get(original.id)
      const active = await tx.objectStore('activeWorkout').get('current')
      if (active?.exerciseId === original.id) throw new Error('Finish or discard the active workout before deleting this exercise.')
      if (!current || current.deletedAt || current.revision !== original.revision) {
        throw new Error('This exercise changed in another window. Reload before deleting it.')
      }
      const now = new Date().toISOString()
      await tx.objectStore('exercises').put({ ...current, deletedAt: now, updatedAt: now, revision: current.revision + 1 })
      await tx.done
    },
  }
}
