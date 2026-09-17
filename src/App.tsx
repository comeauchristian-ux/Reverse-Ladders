import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ExercisePage } from './pages/ExercisePage'
import { ExerciseForm } from './components/ExerciseForm'
import { WorkoutProvider } from './hooks/WorkoutContext'
import { WorkoutPage } from './pages/WorkoutPage'
import { HistoryPage } from './pages/HistoryPage'
import { MaxRepPage } from './pages/MaxRepPage'

export function App() {
  return (
    <WorkoutProvider><Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="exercises/new" element={<ExerciseForm />} />
        <Route path="exercises/:id" element={<ExercisePage />} />
        <Route path="exercises/:id/edit" element={<ExercisePage edit />} />
        <Route path="exercises/:id/history" element={<HistoryPage />} />
        <Route path="exercises/:id/max-rep" element={<MaxRepPage />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes></WorkoutProvider>
  )
}
