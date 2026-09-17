import { Link } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import { ExerciseCard } from '../components/ExerciseCard'

export function HomePage() {
  const { exercises, error, retry } = useExercises()
  return (
    <div className="stack">
      {error ? <div role="alert" className="card panel"><p>{error}</p><button className="button" onClick={retry}>Try again</button></div>
        : exercises === null ? <p role="status">Loading exercises…</p>
        : exercises.length === 0 ? <section className="card empty-state"><h2>Your next ladder starts here</h2><p>Add an exercise to keep track of your progression.</p></section>
        : <div className="stack" aria-label="Exercises">{exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)}</div>}
      <Link className="button" to="/exercises/new">+ Add exercise</Link>
    </div>
  )
}
