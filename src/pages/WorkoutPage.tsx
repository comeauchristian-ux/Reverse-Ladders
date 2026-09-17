import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWorkout } from '../hooks/WorkoutContext'
import { currentMinimum, defaultReps, elapsedSeconds, formatTime, remainingRest } from '../lib/workout'
import { formatLoad } from '../components/ExerciseCard'
import { getDatabase } from '../lib/storage/database'
import { WorkoutSummary } from '../components/WorkoutSummary'
import { SetProgress } from '../components/SetProgress'

export function WorkoutPage() {
  const active = useWorkout()
  const { workout, busy, loading, error, resumed } = active
  const navigate = useNavigate()
  const [now, setNow] = useState(Date.now)
  const [reps, setReps] = useState('0')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [vibration, setVibration] = useState(false)
  const [sound, setSound] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const [preferenceError, setPreferenceError] = useState('')
  const alarm = useRef('')
  const automaticAttempt = useRef('')

  function armSound() {
    if (!sound || !('AudioContext' in window)) return
    try {
      audio.current ??= new AudioContext()
      void audio.current.resume().catch(() => {})
    } catch { /* Audio is optional. */ }
  }

  function playSound() {
    const context = audio.current
    if (!sound || !context || context.state !== 'running') return
    try {
      const oscillator = context.createOscillator()
      const volume = context.createGain()
      oscillator.frequency.value = 660
      volume.gain.setValueAtTime(0.15, context.currentTime)
      volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5)
      oscillator.connect(volume)
      volume.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.5)
      oscillator.onended = () => { oscillator.disconnect(); volume.disconnect() }
    } catch { /* Audio is optional. */ }
  }

  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null }, [])

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = window.setInterval(tick, 250)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [])
  useEffect(() => {
    if (workout) setReps(String(defaultReps(workout)))
  }, [workout?.id, workout?.sets.length, workout?.phase])
  useEffect(() => {
    let mounted = true
    getDatabase().then((db) => db.get('preferences', 'user')).then((preferences) => {
      if (mounted) { setVibration(preferences?.vibrationEnabled ?? false); setSound(preferences?.soundEnabled ?? false) }
    }).catch(() => { if (mounted) setPreferenceError('Could not load alert preferences.') })
    return () => { mounted = false }
  }, [])

  const remaining = workout ? remainingRest(workout, now) : 0
  useEffect(() => {
    if (!workout || workout.phase !== 'resting' || !resumed || remaining > 0 || busy || error) return
    const key = `${workout.id}:${workout.revision ?? 0}`
    if (automaticAttempt.current === key) return
    automaticAttempt.current = key
    void active.rest().then((saved) => {
      if (saved && alarm.current !== key) {
        alarm.current = key
        playSound()
        // Best effort only: supported devices may still deny background vibration.
        if (vibration) { try { navigator.vibrate?.([200, 100, 200]) } catch { /* Unsupported or denied. */ } }
      }
    })
  }, [workout, resumed, remaining, busy, error, vibration, sound, active])

  async function toggleAlert(kind: 'vibrationEnabled' | 'soundEnabled', enabled: boolean) {
    if (kind === 'soundEnabled' && enabled) {
      try { audio.current ??= new AudioContext(); void audio.current.resume().catch(() => {}) } catch { /* Unsupported. */ }
    }
    setPreferenceError('')
    try {
      const db = await getDatabase()
      const tx = db.transaction('preferences', 'readwrite')
      const previous = await tx.store.get('user')
      await tx.store.put({ soundEnabled: previous?.soundEnabled ?? false, vibrationEnabled: previous?.vibrationEnabled ?? false, [kind]: enabled }, 'user')
      await tx.done
      if (kind === 'soundEnabled') setSound(enabled)
      else { setVibration(enabled); if (enabled) { try { navigator.vibrate?.(100) } catch { /* Optional feedback. */ } } }
    } catch { setPreferenceError('Could not save alert preferences. Try again.') }
  }
  async function dismiss() {
    if (await active.dismiss()) navigate('/')
  }

  if (loading) return <p role="status">Loading workout…</p>
  return <div className="stack">
    <Link className="text-link" to="/">‹ Exercises</Link>
    {error && <div role="alert" className="stack"><p className="error">{error}</p><button className="button secondary" onClick={() => void active.reload()}>Reload saved workout</button></div>}
    {!workout ? <section className="card panel"><h2>No active workout</h2><p>Choose an exercise to start training.</p></section> : <>
      <div className="section-heading"><div><h2>{workout.name}</h2><p>{formatLoad(workout)}{workout.variation ? ` · ${workout.variation}` : ''}</p></div><strong className="ladder-badge">{workout.ladderSize}:{workout.target}</strong></div>
      {workout.phase === 'completed' ? <WorkoutSummary key={workout.id} workout={workout} />
        : !resumed ? <section className="card panel stack"><h2>Continue your workout?</h2><p>{workout.sets.length} of {workout.ladderSize} sets recorded. Elapsed time includes time away.</p><button className="button" disabled={busy} onClick={() => { armSound(); setNow(Date.now()); automaticAttempt.current = ''; active.resume() }}>Continue workout</button></section>
        : <>
          <p className="workout-meta">{workout.sets.length} completed · {workout.ladderSize - workout.sets.length} remaining · Elapsed {formatTime(elapsedSeconds(workout, now))}</p>
          <SetProgress completed={workout.sets.length} total={workout.ladderSize} />
          {workout.phase === 'resting' ? <section className="card panel stack rest-panel" aria-label="Rest timer">
            <h2>Rest</h2>
            <div className="rest-clock"><svg viewBox="0 0 120 120" aria-hidden="true"><circle className="rest-track" cx="60" cy="60" r="52" /><circle className="rest-progress" cx="60" cy="60" r="52" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - Math.min(1, remaining / Math.max(1, workout.restSeconds)))} /></svg><div role="timer" aria-label="Rest remaining"><strong>{formatTime(remaining)}</strong><p>/ {formatTime(workout.restSeconds)}</p></div></div>
            <p>Next: Set {workout.sets.length + 1} of {workout.ladderSize}</p>
            {currentMinimum(workout) !== null && <p>Minimum: {currentMinimum(workout)} reps</p>}
            <button className="button secondary" disabled={busy} onClick={() => void active.rest(true)}>Skip rest</button>
          </section> : <form className="card panel stack working-panel" onSubmit={(event) => { event.preventDefault(); armSound(); if (reps.trim() !== '') void active.complete(Number(reps)) }}>
            <h2 aria-live="polite">Set {workout.sets.length + 1} of {workout.ladderSize}</h2>
            <p role="status">{currentMinimum(workout) === null ? 'As many good reps as you can.' : `Minimum: ${currentMinimum(workout)} reps`}</p>
            <label htmlFor="actual-reps">Actual reps</label>
            <div className="rep-control"><button className="button secondary" type="button" aria-label="Decrease reps" disabled={busy || Number(reps) <= 0} onClick={() => setReps(String(Math.max(0, Number(reps) - 1)))}>−</button><input id="actual-reps" aria-label="Actual reps" type="number" inputMode="numeric" min="0" max={Number.MAX_SAFE_INTEGER} step="1" required disabled={busy} value={reps} onChange={(event) => setReps(event.target.value)} /><button className="button secondary" type="button" aria-label="Increase reps" disabled={busy || Number(reps) >= Number.MAX_SAFE_INTEGER} onClick={() => setReps(String(Number(reps) + 1))}>+</button></div>
            <button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Complete set'}</button>
          </form>}
          {'AudioContext' in window && <label className="checkbox-label"><input type="checkbox" checked={sound} onChange={(event) => void toggleAlert('soundEnabled', event.target.checked)} />Sound when rest ends</label>}
          {'vibrate' in navigator && <label className="checkbox-label"><input type="checkbox" checked={vibration} onChange={(event) => void toggleAlert('vibrationEnabled', event.target.checked)} />Vibrate when rest ends</label>}
          {preferenceError && <p role="alert" className="error">{preferenceError}</p>}
        </>}
      {workout.sets.length > 0 && <section className="card panel stack"><h2>Recorded sets</h2><ol className="recorded-sets">{workout.sets.map((set) => <li key={set.setNumber}><span>Set {set.setNumber}</span><strong>{set.actualReps} reps</strong><span>{set.minimumReps === null ? 'Flexible' : `Min ${set.minimumReps}`}</span></li>)}</ol></section>}
      {workout.phase !== 'completed' && (confirmDiscard ? <section className="card panel stack"><h2>Discard this workout?</h2><p>The recorded sets in this unfinished workout will be removed.</p><div className="actions"><button className="button danger" disabled={busy} onClick={dismiss}>Discard workout</button><button className="button secondary" disabled={busy} onClick={() => setConfirmDiscard(false)}>Keep workout</button></div></section> : <button className="delete-button" disabled={busy} onClick={() => setConfirmDiscard(true)}>Discard workout</button>)}
    </>}
  </div>
}
