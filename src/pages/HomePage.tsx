import { Link } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import { ExerciseCard } from '../components/ExerciseCard'
import { useWorkout } from '../hooks/WorkoutContext'

export function HomePage() {
  const { exercises, error, retry } = useExercises()
  const active = useWorkout()
  return (
    <div className="stack">
      {active.workout && <Link className="card panel text-link" to="/workout">{active.workout.phase === 'completed' ? 'View completed workout' : 'Continue workout'} · {active.workout.name}</Link>}
      {active.error && <div role="alert"><p className="error">{active.error}</p><button className="button secondary" onClick={() => void active.reload()}>Reload workout</button></div>}
      {error ? <div role="alert" className="card panel"><p>{error}</p><button className="button" onClick={retry}>Try again</button></div>
        : exercises === null ? <p role="status">Loading exercises…</p>
        : exercises.length === 0 ? <section className="card empty-state"><h2>Your next ladder starts here</h2><p>Add an exercise to keep track of your progression.</p></section>
        : <div className="stack" aria-label="Exercises">{exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)}</div>}
      <Link className="button" to="/exercises/new">+ Add exercise</Link>
    </div>
  )
}
