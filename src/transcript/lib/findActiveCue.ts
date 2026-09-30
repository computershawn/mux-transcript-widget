import type { Cue } from '../types.ts'

/**
 * Returns the index of the cue active at `time`, or -1 if none is.
 *
 * `cues` must be sorted by start time (as `parseVtt` returns them). A cue is
 * active on the half-open range [start, end), so where one cue ends exactly
 * as the next starts, the next one wins. Binary-searches for the last cue
 * with `start <= time`, so when cues overlap the latest-starting one wins.
 * That candidate alone is checked: a long cue that fully contains a shorter,
 * later one isn't reported once the shorter one ends.
 */
export function findActiveCue(cues: readonly Cue[], time: number): number {
  let lo = 0
  let hi = cues.length - 1
  let candidate = -1

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (cues[mid].start <= time) {
      candidate = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return candidate !== -1 && time < cues[candidate].end ? candidate : -1
}
