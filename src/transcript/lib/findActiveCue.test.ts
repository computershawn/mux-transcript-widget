import { describe, expect, test } from 'vitest'
import type { Cue } from '../types.ts'
import { findActiveCue } from './findActiveCue.ts'

function cue(start: number, end: number): Cue {
  return { id: `${start}-${end}`, start, end, text: `${start}-${end}` }
}

// Adjacent cues, a gap between 4 and 6, then one more cue.
const cues = [cue(1, 2), cue(2, 4), cue(6, 8)]

describe('findActiveCue', () => {
  test('returns -1 for an empty list', () => {
    expect(findActiveCue([], 0)).toBe(-1)
    expect(findActiveCue([], 5)).toBe(-1)
  })

  test('returns -1 before the first cue', () => {
    expect(findActiveCue(cues, 0)).toBe(-1)
    expect(findActiveCue(cues, 0.999)).toBe(-1)
  })

  test('returns the cue containing the time', () => {
    expect(findActiveCue(cues, 1.5)).toBe(0)
    expect(findActiveCue(cues, 3)).toBe(1)
    expect(findActiveCue(cues, 7)).toBe(2)
  })

  test('a cue is active from its exact start', () => {
    expect(findActiveCue(cues, 1)).toBe(0)
    expect(findActiveCue(cues, 6)).toBe(2)
  })

  test('a cue is inactive at its exact end', () => {
    expect(findActiveCue(cues, 4)).toBe(-1)
    expect(findActiveCue(cues, 8)).toBe(-1)
  })

  test('where one cue ends as the next starts, the next wins', () => {
    expect(findActiveCue(cues, 2)).toBe(1)
  })

  test('returns -1 in a gap between cues', () => {
    expect(findActiveCue(cues, 5)).toBe(-1)
  })

  test('returns -1 after the last cue', () => {
    expect(findActiveCue(cues, 8.001)).toBe(-1)
    expect(findActiveCue(cues, 1000)).toBe(-1)
  })

  test('the latest-starting cue wins when cues overlap', () => {
    const overlapping = [cue(0, 5), cue(3, 6)]
    expect(findActiveCue(overlapping, 2)).toBe(0)
    expect(findActiveCue(overlapping, 3)).toBe(1)
    expect(findActiveCue(overlapping, 5.5)).toBe(1)
  })

  test('the later cue wins when cues share a start time', () => {
    expect(findActiveCue([cue(1, 3), cue(1, 2)], 1.5)).toBe(1)
  })

  test('works on a single cue', () => {
    expect(findActiveCue([cue(1, 2)], 1)).toBe(0)
    expect(findActiveCue([cue(1, 2)], 2)).toBe(-1)
  })

  test('finds every cue in a long list', () => {
    const many = Array.from({ length: 1000 }, (_, i) => cue(i, i + 0.5))
    for (let i = 0; i < many.length; i++) {
      expect(findActiveCue(many, i + 0.25)).toBe(i)
      expect(findActiveCue(many, i + 0.75)).toBe(-1)
    }
  })
})
