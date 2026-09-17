import type { IDBPDatabase } from 'idb'
import type { LadderDatabase } from './database.ts'
import type { MaxRepTest } from '../../types/domain.ts'
import type { LadderState } from '../ladder/index.ts'
import { getNextProgression } from '../ladder/index.ts'

export type MaxRepInput = Omit<MaxRepTest, 'id' | 'exerciseId'>

export function validateMaxRep(input: MaxRepInput): MaxRepInput {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw new Error('Enter a valid test date.')
  if (!Number.isSafeInteger(input.reps) || input.reps < 0) throw new Error('Reps must be a whole number of zero or greater.')
  if (!['bodyweight', 'added', 'external'].includes(input.loadType)) throw new Error('Choose a load type.')
  if (input.loadType !== 'bodyweight' && (input.load === undefined || !Number.isFinite(input.load) || input.load < 0 || !['lb', 'kg'].includes(input.loadUnit ?? ''))) throw new Error('Enter a valid load and unit.')
  return { date: input.date, reps: input.reps, loadType: input.loadType, load: input.loadType === 'bodyweight' ? undefined : input.load, loadUnit: input.loadType === 'bodyweight' ? undefined : input.loadUnit, notes: input.notes?.trim() || undefined }
}

export function historyRepository(db: IDBPDatabase<LadderDatabase>) {
  return {
    async get(exerciseId: string) {
      const tx = db.transaction(['exercises', 'workouts', 'maxRepTests'])
      const [exercise, workouts, maxRepTests] = await Promise.all([
        tx.objectStore('exercises').get(exerciseId),
        tx.objectStore('workouts').index('exerciseId').getAll(exerciseId),
        tx.objectStore('maxRepTests').index('exerciseId').getAll(exerciseId),
      ])
      await tx.done
      return { exercise, workouts: workouts.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)), maxRepTests: maxRepTests.sort((a, b) => b.date.localeCompare(a.date)) }
    },
    async addMaxRep(exerciseId: string, input: MaxRepInput, id: string = crypto.randomUUID()) {
      const fields = validateMaxRep(input)
      const tx = db.transaction(['exercises', 'maxRepTests'], 'readwrite')
      try {
        const exercise = await tx.objectStore('exercises').get(exerciseId)
        if (!exercise || exercise.deletedAt) throw new Error('This exercise is no longer available.')
        const existing = await tx.objectStore('maxRepTests').get(id)
        if (existing) {
          if (existing.exerciseId !== exerciseId || JSON.stringify(validateMaxRep(existing)) !== JSON.stringify(fields)) throw new Error('This test was already saved with different values.')
          await tx.done
          return existing
        }
        const record = { ...fields, id, exerciseId }
        await tx.objectStore('maxRepTests').add(record)
        await tx.done
        return record
      } catch (error) {
        try { tx.abort() } catch { /* Already closed. */ }
        await tx.done.catch(() => {})
        throw error
      }
    },
    /** The decision, exercise change, and active-slot cleanup commit together. */
    async finalize(workoutId: string, next: LadderState | null, expectedExerciseRevision?: number) {
      const tx = db.transaction(['workouts', 'exercises', 'activeWorkout'], 'readwrite')
      try {
        const record = await tx.objectStore('workouts').get(workoutId)
        if (!record) throw new Error('The completed workout could not be found.')
        // Retrying an acknowledged or interrupted save never applies progression twice.
        if (record.progressionDecision) { await tx.done; return }
        const active = await tx.objectStore('activeWorkout').get('current')
        if (!active || active.id !== workoutId || active.phase !== 'completed') throw new Error('This workout is no longer awaiting a progression decision.')
        if (next) {
          getNextProgression(next.ladderSize, next.target)
          const exercise = await tx.objectStore('exercises').get(record.exerciseId)
          if (!exercise || exercise.deletedAt) throw new Error('The exercise is no longer available. Keep its settings unchanged to finish.')
          if (exercise.revision !== expectedExerciseRevision) throw new Error('The exercise changed in another window. Reload the summary before choosing your next ladder.')
          await tx.objectStore('exercises').put({ ...exercise, ...next, revision: exercise.revision + 1, updatedAt: new Date().toISOString() })
        }
        await tx.objectStore('workouts').put({ ...record, progressionDecision: { decidedAt: new Date().toISOString(), next } })
        await tx.objectStore('activeWorkout').delete('current')
        await tx.done
      } catch (error) {
        try { tx.abort() } catch { /* Already closed. */ }
        await tx.done.catch(() => {})
        throw error
      }
    },
  }
}
