import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Exercise, MaxRepTest } from '../types/domain'
import { getDatabase } from '../lib/storage/database'
import { historyRepository } from '../lib/storage/history'

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function MaxRepPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(today)
  const [reps, setReps] = useState('')
  const [loadType, setLoadType] = useState<MaxRepTest['loadType']>('bodyweight')
  const [load, setLoad] = useState('')
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [recordId] = useState(() => crypto.randomUUID())
  useEffect(() => {
    let mounted = true
    getDatabase().then((db) => db.get('exercises', id!)).then((item) => {
      if (!mounted) return
      if (!item || item.deletedAt) setError('This exercise is no longer available.')
      else { setExercise(item); setLoadType(item.loadType); setLoad(item.load?.toString() ?? ''); setUnit(item.loadUnit ?? 'lb') }
      setLoading(false)
    }).catch(() => { if (mounted) { setError('Could not load the exercise. Reload to try again.'); setLoading(false) } })
    return () => { mounted = false }
  }, [id])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (lock.current || !exercise) return
    lock.current = true; setBusy(true); setError('')
    try {
      await historyRepository(await getDatabase()).addMaxRep(exercise.id, { date, reps: reps.trim() ? Number(reps) : NaN, loadType, load: load === '' ? undefined : Number(load), loadUnit: unit, notes }, recordId)
      navigate(`/exercises/${id}/history`, { replace: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the test. Try again.'); lock.current = false; setBusy(false) }
  }
  return <form className="stack" onSubmit={save}>
    <Link className="text-link" to={`/exercises/${id}/history`}>‹ History</Link>
    <h2>Record max-rep test</h2>
    {error && <p role="alert" className="error">{error}</p>}
    {loading ? <p role="status">Loading exercise…</p> : exercise && <>
      <p>{exercise.name} · This test won’t change your ladder.</p>
      <fieldset className="card panel stack" disabled={busy}>
        <label>Date<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Reps<input type="number" inputMode="numeric" min="0" step="1" required value={reps} onChange={(event) => setReps(event.target.value)} /></label>
        <label>Load type<select value={loadType} onChange={(event) => setLoadType(event.target.value as MaxRepTest['loadType'])}><option value="bodyweight">Bodyweight</option><option value="added">Added weight</option><option value="external">External weight</option></select></label>
        {loadType !== 'bodyweight' && <div className="form-row"><label>Load<input type="number" inputMode="decimal" min="0" step="any" required value={load} onChange={(event) => setLoad(event.target.value)} /></label><label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as 'lb' | 'kg')}><option value="lb">lb</option><option value="kg">kg</option></select></label></div>}
        <label>Notes (optional)<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      </fieldset>
      <button className="button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save max-rep test'}</button>
    </>}
  </form>
}
