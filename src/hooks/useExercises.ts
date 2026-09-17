import { useEffect, useState } from 'react'
import { getDatabase } from '../lib/storage/database'
import { exerciseRepository } from '../lib/storage/exercises'
import type { Exercise } from '../types/domain'

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    setError('')
    getDatabase().then((db) => exerciseRepository(db).list()).then((items) => {
      if (current) setExercises(items)
    }).catch(() => {
      if (current) setError('Your exercises could not be loaded. Check that browser storage is available and try again.')
    })
    const refresh = () => setAttempt((value) => value + 1)
    window.addEventListener('focus', refresh)
    return () => { current = false; window.removeEventListener('focus', refresh) }
  }, [attempt])
  return { exercises, error, retry: () => setAttempt((value) => value + 1) }
}
