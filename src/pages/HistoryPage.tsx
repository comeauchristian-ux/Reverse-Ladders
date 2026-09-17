import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { historyRepository } from '../lib/storage/history'
import { getDatabase } from '../lib/storage/database'
import { HistoryEntry, MaxRepEntry } from '../components/HistoryEntry'
import { StatsCard } from '../components/StatsCard'

export function HistoryPage() {
  const { id } = useParams()
  const [data, setData] = useState<Awaited<ReturnType<ReturnType<typeof historyRepository>['get']>> | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let mounted = true
    setData(null); setError('')
    getDatabase().then((db) => historyRepository(db).get(id!)).then((result) => { if (mounted) setData(result) }).catch(() => { if (mounted) setError('Could not load history. Please try again.') })
    return () => { mounted = false }
  }, [id, attempt])
  const entries = data ? [
    ...data.workouts.map((item) => ({ key: `workout-${item.id}`, time: Date.parse(item.startedAt), node: <HistoryEntry workout={item} /> })),
    ...data.maxRepTests.map((item) => ({ key: `test-${item.id}`, time: Date.parse(item.date.length === 10 ? `${item.date}T12:00:00` : item.date), node: <MaxRepEntry test={item} /> })),
  ].sort((a, b) => b.time - a.time || a.key.localeCompare(b.key)) : []
  return <div className="stack">
    <Link className="text-link" to={data?.exercise && !data.exercise.deletedAt ? `/exercises/${id}` : '/'}>‹ {data?.exercise && !data.exercise.deletedAt ? 'Exercise' : 'Exercises'}</Link>
    {error ? <div role="alert" className="stack"><p className="error">{error}</p><button className="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : !data ? <p role="status">Loading history…</p> : !data.exercise ? <p>Exercise not found.</p> : <>
      <h2>{data.exercise.name} · History</h2>
      {data.exercise.deletedAt && <p>This exercise was deleted. Its recorded history is preserved.</p>}
      <StatsCard workouts={data.workouts} current={data.exercise} />
      {!data.exercise.deletedAt && <Link className="button secondary" to={`/exercises/${id}/max-rep`}>Record max-rep test</Link>}
      {entries.length ? entries.map((entry) => <div key={entry.key}>{entry.node}</div>) : <section className="card empty-state"><h3>No sessions yet</h3><p>Completed workouts and max-rep tests will appear here.</p></section>}
    </>}
  </div>
}
