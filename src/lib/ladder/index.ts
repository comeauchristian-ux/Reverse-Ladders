/** The ladder deliberately attempted, independent of actual reps or load. */
export interface LadderState {
  ladderSize: number
  target: number
}

function assertValidLadder(ladderSize: number, target: number): void {
  if (!Number.isSafeInteger(ladderSize) || ladderSize < 2) {
    throw new RangeError('Ladder size must be a safe integer of at least 2.')
  }
  // Descending to T and duplicating T requires N - T + 2 sets.
  if (!Number.isSafeInteger(target) || target < 2 || target > ladderSize) {
    throw new RangeError('Target must be a safe integer between 2 and the ladder size.')
  }
}

/** Minimum thresholds for all N sets; null marks an unconstrained tail set. */
export function getProgressionMinimums(
  ladderSize: number,
  target: number,
): Array<number | null> {
  assertValidLadder(ladderSize, target)
  const prefixLength = ladderSize - target + 2

  return Array.from({ length: ladderSize }, (_, index) =>
    index < prefixLength ? Math.max(ladderSize - index, target) : null,
  )
}

/**
 * Check the qualifying prefix of an ordered rep sequence (index 0 is set 1).
 * Missing required sets fail; extra reps and unconstrained tail reps are allowed.
 * A passing prefix does not mean the workout is complete: the workout layer must
 * still record all N sets before saving a session or changing progression.
 * Malformed input throws rather than being recorded as a failed attempt.
 */
export function didPassProgression(
  ladderSize: number,
  target: number,
  actualReps: readonly number[],
): boolean {
  assertValidLadder(ladderSize, target)
  if (actualReps.length > ladderSize) {
    throw new RangeError('Actual reps cannot contain more sets than the ladder size.')
  }
  for (const reps of actualReps) {
    if (!Number.isSafeInteger(reps) || reps < 0) {
      throw new RangeError('Actual reps must be non-negative safe integers.')
    }
  }

  const prefixLength = ladderSize - target + 2
  if (actualReps.length < prefixLength) return false

  for (let index = 0; index < prefixLength; index += 1) {
    if (actualReps[index] < Math.max(ladderSize - index, target)) return false
  }
  return true
}

/**
 * Suggest one next step without persisting anything or skipping levels.
 * Omit progressionSuccess for a settings preview; pass the evaluated result for
 * a completed workout. N:N stays unchanged because no rollover rule is defined.
 */
export function getNextProgression(
  ladderSize: number,
  target: number,
  progressionSuccess = true,
): LadderState {
  assertValidLadder(ladderSize, target)
  return {
    ladderSize,
    target: progressionSuccess && target < ladderSize ? target + 1 : target,
  }
}
