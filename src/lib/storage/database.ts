import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import type { ActiveWorkout, Exercise, MaxRepTest, Preferences, Workout } from '../../types/domain.ts'

export interface LadderDatabase extends DBSchema {
  exercises: { key: string; value: Exercise }
  workouts: { key: string; value: Workout; indexes: { exerciseId: string } }
  maxRepTests: { key: string; value: MaxRepTest; indexes: { exerciseId: string } }
  activeWorkout: { key: 'current'; value: ActiveWorkout }
  preferences: { key: 'user'; value: Preferences }
}

export function openDatabase(name = 'reverse-ladders') {
  const pending = openDB<LadderDatabase>(name, 1, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('exercises', { keyPath: 'id' })
        db.createObjectStore('workouts', { keyPath: 'id' }).createIndex('exerciseId', 'exerciseId')
        db.createObjectStore('maxRepTests', { keyPath: 'id' }).createIndex('exerciseId', 'exerciseId')
        db.createObjectStore('activeWorkout')
        db.createObjectStore('preferences')
      }
    },
    blocking() {
      // Release this connection for future schema migrations; reload to reopen it.
      void pending.then((db) => db.close())
    },
  })
  return pending
}

let connection: ReturnType<typeof openDatabase> | undefined
export function getDatabase() {
  if (!connection) {
    connection = openDatabase().catch((error: unknown) => {
      connection = undefined
      throw error
    })
  }
  return connection
}
