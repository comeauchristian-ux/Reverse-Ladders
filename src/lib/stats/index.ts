import type { Workout } from '../../types/domain.ts'
import type { LadderState } from '../ladder/index.ts'
import { didPassProgression, getProgressionMinimums } from '../ladder/index.ts'

/** Recalculate from raw sets and timestamps, not cached session totals. */
export function sessionStats(workout: Workout) {
  const totalReps = workout.sets.reduce((sum, set) => sum + set.actualReps, 0)
  const durationSeconds = Math.max(0, (Date.parse(workout.completedAt) - Date.parse(workout.startedAt)) / 1000)
  const ordered = [...workout.sets].sort((a, b) => a.setNumber - b.setNumber)
  const minimums = getProgressionMinimums(workout.ladderSize, workout.target)
  const missedSets = minimums.flatMap((minimum, index) => {
    if (minimum === null) return []
    const set = ordered.find((item) => item.setNumber === index + 1)
    return !set || set.actualReps < minimum ? [index + 1] : []
  })
  const passed = ordered.length === workout.ladderSize && ordered.every((set, i) => set.setNumber === i + 1)
    && didPassProgression(workout.ladderSize, workout.target, ordered.map((set) => set.actualReps))
  return { totalReps, durationSeconds, density: durationSeconds > 0 ? totalReps * 60 / durationSeconds : null, passed, missedSets }
}

export function exerciseStats(workouts: readonly Workout[]) {
  const ordered = [...workouts].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
  const sessions = ordered.map(sessionStats)
  const totalReps = sessions.reduce((sum, session) => sum + session.totalReps, 0)
  const densities = sessions.flatMap((session) => session.density === null ? [] : [session.density])
  // Ladder size first, then target; this is not a comparison of loads or variations.
  function highest(items: readonly Workout[]): LadderState | null {
    const best = [...items].sort((a, b) => b.ladderSize - a.ladderSize || b.target - a.target)[0]
    return best ? { ladderSize: best.ladderSize, target: best.target } : null
  }
  return {
    totalWorkouts: sessions.length,
    successfulAttempts: sessions.filter((session) => session.passed).length,
    totalReps,
    averageReps: sessions.length ? totalReps / sessions.length : null,
    latestReps: sessions[0]?.totalReps ?? null,
    averageDuration: sessions.length ? sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / sessions.length : null,
    averageDensity: densities.length ? densities.reduce((sum, density) => sum + density, 0) / densities.length : null,
    bestDensity: densities.length ? Math.max(...densities) : null,
    highestAttempted: highest(ordered),
    highestPassed: highest(ordered.filter((_, index) => sessions[index].passed)),
  }
}
