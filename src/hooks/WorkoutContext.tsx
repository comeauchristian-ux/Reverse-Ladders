import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ActiveWorkout } from '../types/domain'
import { getDatabase } from '../lib/storage/database'
import { workoutRepository } from '../lib/storage/workouts'

function useWorkoutState() {
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resumed, setResumed] = useState(false)
  const lock = useRef(false)
  async function reload() {
    setLoading(true)
    setError('')
    try { setWorkout(await workoutRepository(await getDatabase()).get()); setResumed(false) }
    catch { setError('Could not load the saved workout. Check browser storage and try again.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [])
  async function run(action: (repository: ReturnType<typeof workoutRepository>) => Promise<ActiveWorkout | null>) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const next = await action(workoutRepository(await getDatabase()))
      setWorkout(next)
      setResumed(true)
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the workout. Try again.')
      return false
    } finally { lock.current = false; setBusy(false) }
  }
  return { workout, loading, busy, error, resumed, resume: () => setResumed(true), reload,
    start: (id: string) => run((repo) => repo.start(id)),
    complete: (reps: number) => run((repo) => repo.complete(workout!, reps)),
    rest: (skip = false) => run((repo) => repo.rest(workout!, skip)),
    dismiss: () => run((repo) => repo.dismiss(workout!)),
  }
}
const WorkoutContext = createContext<ReturnType<typeof useWorkoutState> | null>(null)
export function WorkoutProvider({ children }: { children: ReactNode }) {
  const state = useWorkoutState()
  return <WorkoutContext.Provider value={state}>{children}</WorkoutContext.Provider>
}
export function useWorkout() {
  const value = useContext(WorkoutContext)
  if (!value) throw new Error('WorkoutProvider is required.')
  return value
}
