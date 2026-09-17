import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActiveWorkout, Exercise } from '../types/domain'
import { completedWorkout, formatTime } from '../lib/workout'
import { sessionStats } from '../lib/stats'
import { getNextProgression } from '../lib/ladder'
import { getDatabase } from '../lib/storage/database'
import { useWorkout } from '../hooks/WorkoutContext'

export function WorkoutSummary({ workout }: { workout: ActiveWorkout }) {
  const active = useWorkout()
  const navigate = useNavigate()
  const metrics = sessionStats(completedWorkout(workout))
  const suggested = getNextProgression(workout.ladderSize, workout.target, metrics.passed)
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [keep, setKeep] = useState(false)
  const [size, setSize] = useState(String(suggested.ladderSize))
  const [target, setTarget] = useState(String(suggested.target))
  const [changed, setChanged] = useState(false)
  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    getDatabase().then((db) => db.get('exercises', workout.exerciseId)).then((item) => {
      if (!mounted) return
      const changed = !!item && (workout.exerciseRevision !== undefined ? item.revision !== workout.exerciseRevision : item.ladderSize !== workout.ladderSize || item.target !== workout.target || item.load !== workout.load || item.loadUnit !== workout.loadUnit || item.loadType !== workout.loadType || item.variation !== workout.variation)
      setExercise(item && !item.deletedAt ? item : null)
      setChanged(changed)
      setKeep(changed || !item || !!item.deletedAt)
      setLoading(false)
    }).catch(() => { if (mounted) { setError('Could not load current exercise settings. Try again.'); setLoading(false) } })
    return () => { mounted = false }
  }, [workout.id, workout.exerciseId, attempt])
  async function finish(destination: string) {
    if (loading || error) return
    if (await active.finalize(keep ? null : { ladderSize: Number(size), target: Number(target) }, exercise?.revision)) navigate(destination)
  }
  const valid = keep || (size !== '' && target !== '' && Number.isSafeInteger(Number(size)) && Number.isSafeInteger(Number(target)) && Number(size) >= 2 && Number(target) >= 2 && Number(target) <= Number(size))
  return <section className="card panel stack">
    <h2>Workout complete</h2>
    <p>{workout.ladderSize}:{workout.target} attempted · {workout.sets.length} sets recorded</p>
    <dl className="metrics"><div><dt>Total reps</dt><dd>{metrics.totalReps}</dd></div><div><dt>Duration</dt><dd>{formatTime(metrics.durationSeconds)}</dd></div><div><dt>Density</dt><dd>{metrics.density === null ? '—' : `${metrics.density.toFixed(1)} reps/min`}</dd></div></dl>
    <p className={metrics.passed ? 'result-pass' : 'result-missed'}>Progression target: {metrics.passed ? 'PASSED' : 'NOT COMPLETED'}</p>
    {metrics.missedSets.length > 0 && <p>Minimum missed on set{metrics.missedSets.length === 1 ? '' : 's'} {metrics.missedSets.join(', ')}.</p>}
    <p>Suggested next session: <strong>{suggested.ladderSize}:{suggested.target}</strong></p>
    {workout.target === workout.ladderSize && metrics.passed && <p>Top target reached. Keep this ladder or choose another below.</p>}
    {loading ? <p role="status">Loading next-session settings…</p> : <>
      {changed && <p>The exercise was edited after this workout started. Its current settings will be kept unless you choose a new ladder below.</p>}
      {exercise && <p>Current exercise ladder: {exercise.ladderSize}:{exercise.target}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <button type="button" className="text-button" disabled={active.busy} onClick={() => setAttempt((value) => value + 1)}>Reload current settings</button>
      <label className="checkbox-label"><input type="checkbox" checked={keep} disabled={!exercise || active.busy} onChange={(event) => setKeep(event.target.checked)} />Keep exercise settings unchanged</label>
      {!keep && <div className="form-row"><label>Next ladder size<input type="number" inputMode="numeric" min="2" step="1" value={size} disabled={active.busy} onChange={(event) => setSize(event.target.value)} /></label><label>Next target<input type="number" inputMode="numeric" min="2" max={Number(size)} step="1" value={target} disabled={active.busy} onChange={(event) => setTarget(event.target.value)} /></label></div>}
      {!valid && <p role="alert">Choose whole numbers with 2 ≤ target ≤ ladder size.</p>}
      <button className="button" disabled={active.busy || !valid || !!error} onClick={() => void finish('/')}>{active.busy ? 'Saving…' : 'Done'}</button>
      <button className="button secondary" disabled={active.busy || !valid || !!error} onClick={() => void finish(`/exercises/${workout.exerciseId}/history`)}>Save and view history</button>
    </>}
  </section>
}
