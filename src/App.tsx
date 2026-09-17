import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ExercisePage } from './pages/ExercisePage'
import { ExerciseForm } from './components/ExerciseForm'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="exercises/new" element={<ExerciseForm />} />
        <Route path="exercises/:id" element={<ExercisePage />} />
        <Route path="exercises/:id/edit" element={<ExercisePage edit />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
