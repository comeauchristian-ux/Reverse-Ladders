import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="card empty-state" aria-labelledby="not-found-heading">
      <h2 id="not-found-heading">Page not found</h2>
      <p>Return to your exercises to get back on track.</p>
      <Link className="button" to="/">Back to exercises</Link>
    </section>
  )
}
