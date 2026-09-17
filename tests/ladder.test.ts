import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  didPassProgression,
  getNextProgression,
  getProgressionMinimums,
} from '../src/lib/ladder/index.ts'

describe('progression minimums', () => {
  const examples: [number, number, Array<number | null>][] = [
    [9, 4, [9, 8, 7, 6, 5, 4, 4, null, null]],
    [9, 5, [9, 8, 7, 6, 5, 5, null, null, null]],
    [9, 6, [9, 8, 7, 6, 6, null, null, null, null]],
    [9, 9, [9, 9, null, null, null, null, null, null, null]],
    [10, 5, [10, 9, 8, 7, 6, 5, 5, null, null, null]],
    [6, 6, [6, 6, null, null, null, null]],
    [2, 2, [2, 2]],
    [5, 2, [5, 4, 3, 2, 2]],
  ]

  for (const [size, target, expected] of examples) {
    it(`builds ${size}:${target} with exactly ${size} sets`, () => {
      assert.deepEqual(getProgressionMinimums(size, target), expected)
    })

    it(`evaluates each minimum independently for ${size}:${target}`, () => {
      const reps = expected.map((minimum) => minimum ?? 0)
      assert.equal(didPassProgression(size, target, reps), true)
      expected.forEach((minimum, index) => {
        if (minimum === null) return
        const missed = [...reps]
        missed[index] = minimum - 1
        assert.equal(didPassProgression(size, target, missed), false)
      })
    })
  }
})

describe('progression success', () => {
  const examples: [string, number[], boolean][] = [
    ['extra reps on set 5', [9, 8, 7, 6, 6, 5, 4, 3, 2], true],
    ['strong tail', [9, 8, 7, 6, 6, 5, 5, 5, 5], true],
    ['missed duplicated target', [9, 8, 7, 6, 5, 4, 5, 5, 5], false],
    ['low tail', [9, 8, 7, 6, 5, 5, 1, 1, 1], true],
    ['zero tail', [9, 8, 7, 6, 5, 5, 0, 0, 0], true],
    ['all qualifying reps above minimum', [10, 9, 8, 7, 6, 6], true],
    ['qualifying prefix alone', [9, 8, 7, 6, 5, 5], true],
    ['missing last required set', [9, 8, 7, 6, 5], false],
    ['no recorded sets', [], false],
    ['extra reps cannot compensate for a missed set', [8, 20, 20, 20, 20, 20, 20, 20, 20], false],
  ]

  for (const [label, reps, expected] of examples) {
    it(label, () => assert.equal(didPassProgression(9, 5, reps), expected))
  }

  it('does not mutate the recorded performance', () => {
    const reps = Object.freeze([9, 8, 7, 6, 6, 5, 4, 3, 2])
    assert.equal(didPassProgression(9, 5, reps), true)
    assert.deepEqual(reps, [9, 8, 7, 6, 6, 5, 4, 3, 2])
  })
})

describe('next progression', () => {
  it('previews one step up', () => {
    assert.deepEqual(getNextProgression(9, 5), { ladderSize: 9, target: 6 })
  })

  it('never skips levels even when performance meets higher targets', () => {
    const reps = [10, 10, 10, 10, 10, 10, 10, 10, 10]
    assert.equal(didPassProgression(9, 9, reps), true)
    assert.deepEqual(getNextProgression(9, 5, didPassProgression(9, 5, reps)), {
      ladderSize: 9, target: 6,
    })
  })

  it('retains the attempted state after failure', () => {
    const reps = [9, 8, 7, 6, 5, 4, 5, 5, 5]
    assert.deepEqual(getNextProgression(9, 5, didPassProgression(9, 5, reps)), {
      ladderSize: 9, target: 5,
    })
  })

  it('reaches N:N without going past it or inventing a rollover', () => {
    assert.deepEqual(getNextProgression(9, 8, true), { ladderSize: 9, target: 9 })
    for (const size of [2, 6, 9]) {
      for (const passed of [true, false]) {
        assert.deepEqual(getNextProgression(size, size, passed), { ladderSize: size, target: size })
      }
    }
  })
})

describe('invalid input', () => {
  const invalidLadders: [number, number][] = [
    [0, 2], [1, 1], [-9, 5], [9.5, 5], [NaN, 5], [Infinity, 5],
    [Number.MAX_SAFE_INTEGER + 1, 5],
    [9, 0], [9, 1], [9, -1], [9, 10], [9, 5.5], [9, NaN], [9, Infinity],
  ]

  for (const [size, target] of invalidLadders) {
    it(`rejects invalid ladder ${size}:${target} in every public function`, () => {
      assert.throws(() => getProgressionMinimums(size, target), RangeError)
      assert.throws(() => didPassProgression(size, target, []), RangeError)
      assert.throws(() => getNextProgression(size, target), RangeError)
    })
  }

  for (const invalid of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects invalid reps ${invalid}, including in the tail`, () => {
      assert.throws(() => didPassProgression(9, 5, [invalid]), RangeError)
      assert.throws(() => didPassProgression(9, 5, [9, 8, 7, 6, 5, 5, invalid]), RangeError)
    })
  }

  it('rejects more than N sets', () => {
    assert.throws(() => didPassProgression(2, 2, [2, 2, 2]), RangeError)
  })

  it('rejects holes in a rep sequence', () => {
    assert.throws(() => didPassProgression(9, 5, new Array<number>(6)), RangeError)
  })
})
