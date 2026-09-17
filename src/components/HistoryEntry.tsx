import type { MaxRepTest, Workout } from '../types/domain'
import { sessionStats } from '../lib/stats'
import { formatTime } from '../lib/workout'

export function displayDate(value: string) {
  return new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
function loadLabel(item: { loadType: string; load?: number; loadUnit?: string }) {
  return item.loadType === 'bodyweight' ? 'Bodyweight' : `${item.loadType === 'added' ? '+' : ''}${item.load} ${item.loadUnit}`
}
export function HistoryEntry({ workout }: { workout: Workout }) {
  const stats = sessionStats(workout)
  return <article className="card panel stack">
    <div className="section-heading"><h3>{workout.ladderSize}:{workout.target}</h3><time dateTime={workout.startedAt}>{displayDate(workout.startedAt)}</time></div>
    <p className={stats.passed ? 'result-pass' : 'result-missed'}>{stats.passed ? 'Progression target passed' : 'Progression target not completed'}</p>
    <p>{loadLabel(workout)}{workout.variation ? ` · ${workout.variation}` : ''} · Rest {workout.restSeconds}s</p>
    <p>{stats.totalReps} reps · {formatTime(stats.durationSeconds)} · {stats.density === null ? 'Density unavailable' : `${stats.density.toFixed(1)} reps/min`}</p>
    <div><p className="eyebrow">Actual reps</p><p className="minimums">{[...workout.sets].sort((a, b) => a.setNumber - b.setNumber).map((set) => set.actualReps).join(' · ')}</p></div>
    {stats.missedSets.length > 0 && <p>Minimum missed on set{stats.missedSets.length === 1 ? '' : 's'} {stats.missedSets.join(', ')}.</p>}
    {workout.progressionDecision && <p className="small-text">{workout.progressionDecision.next ? `Next ladder chosen: ${workout.progressionDecision.next.ladderSize}:${workout.progressionDecision.next.target}` : 'Exercise settings kept unchanged.'}</p>}
  </article>
}
export function MaxRepEntry({ test }: { test: MaxRepTest }) {
  return <article className="card panel stack"><div className="section-heading"><h3>Max-rep test</h3><time dateTime={test.date}>{displayDate(test.date)}</time></div><strong className="ladder-badge">{test.reps} reps</strong><p>{loadLabel(test)}</p>{test.notes && <p className="notes">{test.notes}</p>}</article>
}
