import { getNextProgression } from '../lib/ladder'

export function ProgressionPreview({ ladderSize, target }: { ladderSize: number; target: number }) {
  try { getNextProgression(ladderSize, target) } catch { return <p>Choose a ladder size of at least 2 and a target between 2 and the ladder size.</p> }
  const prefixLength = ladderSize - target + 2
  // Bound rendering even while a user is typing a very large ladder size.
  const prefix = Array.from({ length: Math.min(prefixLength, 20) }, (_, i) => Math.max(ladderSize - i, target))
  const next = getNextProgression(ladderSize, target)
  return (
    <section className="progression-preview" aria-label="Progression preview">
      <p className="eyebrow">Minimum progression requirement</p>
      <p className="minimums">{prefix.join(' · ')}{prefixLength > 20 ? ` · … · ${target} · ${target}` : ''}</p>
      <p>{ladderSize} total sets · {ladderSize - prefixLength} flexible tail sets</p>
      <p>These are minimums. Extra reps are always welcome.</p>
      <p>{target === ladderSize ? 'Top target reached. Choose your next ladder manually.' : `Next progression: ${next.ladderSize}:${next.target}`}</p>
    </section>
  )
}
