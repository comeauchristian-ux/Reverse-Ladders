import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDatabase } from '../lib/storage/database'
import { exerciseRepository } from '../lib/storage/exercises'
import { formatLoad } from '../components/ExerciseCard'
import { ProgressionPreview } from '../components/ProgressionPreview'
import { ExerciseForm } from '../components/ExerciseForm'
import type { Exercise } from '../types/domain'
import { useWorkout } from '../hooks/WorkoutContext'

export function ExercisePage({ edit = false }: { edit?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const active = useWorkout()
  const [exercise, setExercise] = useState<Exercise | null | undefined>(null)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let current = true
    setExercise(null)
    setError('')
    setConfirmDelete(false)
    getDatabase().then((db) => exerciseRepository(db).get(id!)).then((item) => {
      if (current) setExercise(item)
    }).catch(() => { if (current) setError('Could not load this exercise. Reload to try again.') })
    return () => { current = false }
  }, [id, edit])
  async function remove() {
    if (!exercise || busy) return
    setBusy(true)
    setError('')
    try {
      await exerciseRepository(await getDatabase()).remove(exercise)
      navigate('/')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete the exercise. Try again.')
      setBusy(false)
    }
  }
  return <div className="stack">
    <Link className="text-link" to="/">‹ Exercises</Link>
    {error && <p role="alert" className="error">{error}</p>}
    {exercise === null ? !error && <p role="status">Loading exercise…</p> : !exercise ? <p>This exercise is no longer available.</p>
      : edit ? <ExerciseForm key={exercise.id} exercise={exercise} />
      : <>
        <div className="section-heading"><div><h2>{exercise.name}</h2><p>{formatLoad(exercise)}</p>{exercise.variation && <p>{exercise.variation}</p>}</div><Link className="text-link" to={`/exercises/${id}/edit`}>Edit</Link></div>
        <section className="card panel current-ladder"><p className="eyebrow">Current ladder</p><strong>{exercise.ladderSize}:{exercise.target}</strong><p>Rest: {exercise.restSeconds} seconds</p></section>
        <ProgressionPreview ladderSize={exercise.ladderSize} target={exercise.target} />
        {active.error && <p role="alert" className="error">{active.error}</p>}
        {active.workout ? <Link className="button" to="/workout">{active.workout.phase === 'completed' ? 'View completed workout' : 'Continue workout'} · {active.workout.name}</Link>
          : <button className="button" disabled={active.loading || active.busy} onClick={async () => { if (await active.start(exercise.id)) navigate('/workout') }}>{active.busy ? 'Starting…' : 'Start workout'}</button>}
        {exercise.notes && <section className="card panel"><h2>Notes</h2><p className="notes">{exercise.notes}</p></section>}
        {confirmDelete ? <section className="card panel stack" aria-label="Confirm deletion"><h2>Delete {exercise.name}?</h2><p>This removes the exercise from your list. Recorded history will be kept.</p><div className="actions"><button className="button danger" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete exercise'}</button><button className="button secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button></div></section>
          : <button className="delete-button" onClick={() => setConfirmDelete(true)}>Delete exercise</button>}
      </>}
  </div>
}
