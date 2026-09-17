import type { Workout } from '../types/domain'
import { exerciseStats } from '../lib/stats'
import { formatTime } from '../lib/workout'
import type { LadderState } from '../lib/ladder'

const ladder = (value: LadderState | null) => value ? `${value.ladderSize}:${value.target}` : '—'
const decimal = (value: number | null) => value === null ? '—' : value.toFixed(1)

export function StatsCard({ workouts, current }: { workouts: Workout[]; current: LadderState }) {
  const stats = exerciseStats(workouts)
  const items = [
    ['Workouts', stats.totalWorkouts], ['Successful attempts', stats.successfulAttempts],
    ['Lifetime workout reps', stats.totalReps], ['Average reps', decimal(stats.averageReps)],
    ['Latest workout reps', stats.latestReps ?? '—'], ['Average duration', stats.averageDuration === null ? '—' : formatTime(stats.averageDuration)],
    ['Average reps/min', decimal(stats.averageDensity)], ['Best reps/min', decimal(stats.bestDensity)],
    ['Current ladder', ladder(current)], ['Highest attempted', ladder(stats.highestAttempted)], ['Highest passed', ladder(stats.highestPassed)],
  ]
  return <details className="card panel"><summary>Exercise statistics</summary><dl className="metrics stats-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="small-text">Workout statistics include all recorded loads and variations, excluding max-rep tests. Highest ladders are ordered by size, then target. Average density is the mean of session densities; zero-duration sessions are excluded.</p></details>
}
