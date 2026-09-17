import type { ActiveWorkout, ExerciseSnapshot, Workout } from '../../types/domain.ts'
import { didPassProgression, getProgressionMinimums } from '../ladder/index.ts'

export function startWorkout(snapshot: ExerciseSnapshot, id: string, now: number): ActiveWorkout {
  return { ...snapshot, id, revision: 0, startedAt: new Date(now).toISOString(), phase: 'working', sets: [], restStartedAt: null, restEndsAt: null }
}

export function remainingRest(workout: ActiveWorkout, now: number): number {
  return workout.phase === 'resting' && workout.restEndsAt ? Math.max(0, Math.ceil((Date.parse(workout.restEndsAt) - now) / 1000)) : 0
}

export function elapsedSeconds(workout: ActiveWorkout, now: number): number {
  const end = workout.phase === 'completed' ? Date.parse(workout.sets.at(-1)!.completedAt) : now
  return Math.max(0, (end - Date.parse(workout.startedAt)) / 1000)
}

export function currentMinimum(workout: ActiveWorkout): number | null {
  return getProgressionMinimums(workout.ladderSize, workout.target)[workout.sets.length] ?? null
}

export function defaultReps(workout: ActiveWorkout): number {
  return currentMinimum(workout) ?? workout.sets.at(-1)?.actualReps ?? 0
}

export function completeSet(workout: ActiveWorkout, reps: number, now: number): ActiveWorkout {
  if (workout.phase !== 'working' || workout.sets.length >= workout.ladderSize) throw new Error('This set is not ready to complete.')
  if (!Number.isSafeInteger(reps) || reps < 0) throw new Error('Reps must be a whole number of zero or greater.')
  const previousTime = Date.parse(workout.sets.at(-1)?.completedAt ?? workout.startedAt)
  if (!Number.isFinite(now) || now < previousTime) throw new Error('The clock moved backwards. Check your device time and retry.')
  const completedAt = new Date(now).toISOString()
  const sets = [...workout.sets, { setNumber: workout.sets.length + 1, minimumReps: currentMinimum(workout), actualReps: reps, completedAt }]
  const final = sets.length === workout.ladderSize
  const rest = !final && workout.restSeconds > 0
  return { ...workout, revision: (workout.revision ?? 0) + 1, sets, phase: final ? 'completed' : rest ? 'resting' : 'working', restStartedAt: rest ? completedAt : null, restEndsAt: rest ? new Date(now + workout.restSeconds * 1000).toISOString() : null }
}

export function finishRest(workout: ActiveWorkout, now: number, skip = false): ActiveWorkout {
  if (workout.phase !== 'resting') throw new Error('There is no rest to finish.')
  if (!skip && remainingRest(workout, now) > 0) throw new Error('Rest is still running.')
  return { ...workout, revision: (workout.revision ?? 0) + 1, phase: 'working', restStartedAt: null, restEndsAt: null }
}

export function completedWorkout(workout: ActiveWorkout): Workout {
  if (workout.phase !== 'completed' || workout.sets.length !== workout.ladderSize) throw new Error('Complete every set before saving the workout.')
  const { revision: _revision, phase: _phase, restStartedAt: _start, restEndsAt: _end, ...record } = workout
  const durationSeconds = elapsedSeconds(workout, 0)
  const totalActualReps = workout.sets.reduce((sum, set) => sum + set.actualReps, 0)
  return { ...record, date: workout.startedAt, completedAt: workout.sets.at(-1)!.completedAt, durationSeconds, totalActualReps, repsPerMinute: durationSeconds > 0 ? totalActualReps * 60 / durationSeconds : 0, progressionSuccess: didPassProgression(workout.ladderSize, workout.target, workout.sets.map((set) => set.actualReps)) }
}

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
