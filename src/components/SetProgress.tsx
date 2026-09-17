export function SetProgress({ completed, total }: { completed: number; total: number }) {
  return <div className="set-progress" role="progressbar" aria-label="Completed sets" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-valuetext={`${completed} of ${total} sets completed`}>
    {total <= 24 ? <div className="set-dots" aria-hidden="true">{Array.from({ length: total }, (_, index) => <span key={index} className={index < completed ? 'set-dot done' : index === completed ? 'set-dot current' : 'set-dot'}>{index < completed ? '✓' : ''}</span>)}</div>
      : <progress aria-hidden="true" value={completed} max={total} />}
  </div>
}
