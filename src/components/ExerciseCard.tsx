import { Link } from 'react-router-dom'
import type { ExerciseInput, Exercise } from '../types/domain'

export function formatLoad(exercise: ExerciseInput) {
  return exercise.loadType === 'bodyweight' ? 'Bodyweight' : `${exercise.loadType === 'added' ? '+' : ''}${exercise.load} ${exercise.loadUnit}`
}

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link className="card exercise-card" to={`/exercises/${exercise.id}`}>
      <div><h2>{exercise.name}</h2><p>{formatLoad(exercise)}</p>{exercise.variation && <p>{exercise.variation}</p>}</div>
      <strong className="ladder-badge">{exercise.ladderSize}:{exercise.target}</strong><span aria-hidden="true">›</span>
    </Link>
  )
}
