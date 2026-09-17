export interface ExerciseInput {
  name: string
  variation?: string
  loadType: 'bodyweight' | 'added' | 'external'
  load?: number
  loadUnit?: 'lb' | 'kg'
  ladderSize: number
  target: number
  restSeconds: number
  notes?: string
}

export interface Exercise extends ExerciseInput {
  id: string
  createdAt: string
  updatedAt: string
  revision: number
  deletedAt?: string
}

/** Copied at workout start: subsequent exercise edits never rewrite history. */
export interface ExerciseSnapshot extends Omit<ExerciseInput, 'notes'> {
  exerciseId: string
}

export interface WorkoutSet {
  setNumber: number
  minimumReps: number | null
  actualReps: number
  completedAt: string
}

export interface Workout extends ExerciseSnapshot {
  id: string
  date: string
  startedAt: string
  completedAt: string
  durationSeconds: number
  totalActualReps: number
  repsPerMinute: number
  progressionSuccess: boolean
  sets: WorkoutSet[]
}

export interface ActiveWorkout extends ExerciseSnapshot {
  id: string
  startedAt: string
  phase: 'working' | 'resting' | 'completed'
  sets: WorkoutSet[]
  restStartedAt: string | null
  restEndsAt: string | null
}

export interface MaxRepTest {
  id: string
  exerciseId: string
  date: string
  reps: number
  loadType: ExerciseInput['loadType']
  load?: number
  loadUnit?: ExerciseInput['loadUnit']
  notes?: string
}

export interface Preferences {
  soundEnabled: boolean
  vibrationEnabled: boolean
}
