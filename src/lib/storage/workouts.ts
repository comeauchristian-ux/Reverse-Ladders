import type { IDBPDatabase } from 'idb'
import type { LadderDatabase } from './database.ts'
import type { ActiveWorkout } from '../../types/domain.ts'
import { snapshotExercise } from './exercises.ts'
import { completeSet, completedWorkout, finishRest, startWorkout } from '../workout/index.ts'

export function workoutRepository(db: IDBPDatabase<LadderDatabase>) {
  async function change(expected: ActiveWorkout, transition: (current: ActiveWorkout) => ActiveWorkout | null) {
    const tx = db.transaction(['activeWorkout', 'workouts'], 'readwrite')
    try {
    const store = tx.objectStore('activeWorkout')
    const current = await store.get('current')
    if (!current || current.id !== expected.id || (current.revision ?? 0) !== (expected.revision ?? 0)) {
      throw new Error('The workout changed in another window. Reload the workout before continuing.')
    }
    const next = transition(current)
    if (next) {
      await store.put(next, 'current')
      if (next.phase === 'completed') await tx.objectStore('workouts').put(completedWorkout(next))
    } else await store.delete('current')
    await tx.done
    return next
    } catch (error) {
      try { tx.abort() } catch { /* Already completed or aborted. */ }
      await tx.done.catch(() => {})
      throw error
    }
  }
  return {
    async get() { return (await db.get('activeWorkout', 'current')) ?? null },
    async start(exerciseId: string, now = Date.now()) {
      const tx = db.transaction(['exercises', 'activeWorkout'], 'readwrite')
      try {
      const active = tx.objectStore('activeWorkout')
      if (await active.get('current')) throw new Error('Continue or discard your current workout before starting another.')
      const exercise = await tx.objectStore('exercises').get(exerciseId)
      if (!exercise || exercise.deletedAt) throw new Error('This exercise is no longer available.')
      const workout = startWorkout(snapshotExercise(exercise), crypto.randomUUID(), now)
      await active.add(workout, 'current')
      await tx.done
      return workout
      } catch (error) {
        try { tx.abort() } catch { /* Already completed or aborted. */ }
        await tx.done.catch(() => {})
        throw error
      }
    },
    complete: (expected: ActiveWorkout, reps: number, now = Date.now()) => change(expected, (current) => completeSet(current, reps, now)),
    rest: (expected: ActiveWorkout, skip = false, now = Date.now()) => change(expected, (current) => finishRest(current, now, skip)),
    dismiss: (expected: ActiveWorkout) => change(expected, () => null),
  }
}
