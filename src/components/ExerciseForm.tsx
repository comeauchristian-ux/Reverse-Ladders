import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDatabase } from '../lib/storage/database'
import { exerciseRepository } from '../lib/storage/exercises'
import type { Exercise, ExerciseInput } from '../types/domain'
import { ProgressionPreview } from './ProgressionPreview'

export function ExerciseForm({ exercise }: { exercise?: Exercise }) {
  const navigate = useNavigate()
  const [name, setName] = useState(exercise?.name ?? '')
  const [variation, setVariation] = useState(exercise?.variation ?? '')
  const [loadType, setLoadType] = useState<ExerciseInput['loadType']>(exercise?.loadType ?? 'bodyweight')
  const [load, setLoad] = useState(exercise?.load?.toString() ?? '')
  const [unit, setUnit] = useState<NonNullable<ExerciseInput['loadUnit']>>(exercise?.loadUnit ?? 'lb')
  const [size, setSize] = useState(String(exercise?.ladderSize ?? 9))
  const [target, setTarget] = useState(String(exercise?.target ?? 5))
  const [rest, setRest] = useState(String(exercise?.restSeconds ?? 60))
  const [notes, setNotes] = useState(exercise?.notes ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const input: ExerciseInput = { name, variation, loadType, load: load === '' ? undefined : Number(load), loadUnit: unit, ladderSize: Number(size), target: Number(target), restSeconds: Number(rest), notes }
      const repository = exerciseRepository(await getDatabase())
      const saved = exercise ? await repository.update(exercise, input) : await repository.create(input)
      navigate(`/exercises/${saved.id}`, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this exercise. Please try again.')
      setBusy(false)
    }
  }
  return <form className="stack" onSubmit={save}>
    <h2>{exercise ? 'Edit exercise' : 'Add exercise'}</h2>
    {error && <p role="alert" className="error">{error}</p>}
    <fieldset className="card panel stack" disabled={busy}>
      <label>Name<input autoComplete="off" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Pull-ups" /></label>
      <label>Variation <span>(optional)</span><input value={variation} onChange={(e) => setVariation(e.target.value)} placeholder="Pronated grip" /></label>
      <label>Load type<select value={loadType} onChange={(e) => setLoadType(e.target.value as ExerciseInput['loadType'])}><option value="bodyweight">Bodyweight</option><option value="added">Added weight</option><option value="external">External weight</option></select></label>
      {loadType !== 'bodyweight' && <div className="form-row"><label>Load<input type="number" inputMode="decimal" required min="0" step="any" value={load} onChange={(e) => setLoad(e.target.value)} /></label><label>Unit<select value={unit} onChange={(e) => setUnit(e.target.value as 'lb' | 'kg')}><option value="lb">lb</option><option value="kg">kg</option></select></label></div>}
      <div className="form-row"><label>Ladder size (N)<input type="number" inputMode="numeric" required min="2" step="1" value={size} onChange={(e) => setSize(e.target.value)} /></label><label>Target (T)<input type="number" inputMode="numeric" required min="2" max={Number(size) || undefined} step="1" value={target} onChange={(e) => setTarget(e.target.value)} /></label></div>
      <label>Rest (seconds)<input type="number" inputMode="numeric" required min="0" step="1" value={rest} onChange={(e) => setRest(e.target.value)} /></label>
      <label>Notes <span>(optional)</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
    </fieldset>
    <ProgressionPreview ladderSize={Number(size)} target={Number(target)} />
    <button className="button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save exercise'}</button>
    {!busy && <Link className="button secondary" to={exercise ? `/exercises/${exercise.id}` : '/'}>Cancel</Link>}
  </form>
}
