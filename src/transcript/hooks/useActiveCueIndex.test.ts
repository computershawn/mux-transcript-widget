import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Cue } from '../types.ts'
import { useActiveCueIndex } from './useActiveCueIndex.ts'
import type { MediaTarget } from './useActiveCueIndex.ts'

// Two adjacent cues, then a gap from 4s to 6s before the third.
const cues: Cue[] = [
  { id: 'a', start: 0, end: 2, text: 'A' },
  { id: 'b', start: 2, end: 4, text: 'B' },
  { id: 'c', start: 6, end: 8, text: 'C' },
]

/**
 * A real <video> whose `currentTime` and `paused` the test controls through
 * `clock`. jsdom can't play media, so both are replaced with getters.
 */
function createVideo() {
  const video = document.createElement('video')
  const clock = { time: 0, paused: true }
  Object.defineProperty(video, 'currentTime', { get: () => clock.time, configurable: true })
  Object.defineProperty(video, 'paused', { get: () => clock.paused, configurable: true })

  /** Fires a media event, inside `act` so React applies any state update. */
  function dispatch(eventType: string) {
    act(() => {
      video.dispatchEvent(new Event(eventType))
    })
  }
  return { video, clock, dispatch }
}

// Manual requestAnimationFrame: frames only run when the test calls runFrame().
// `frames` holds the pending callbacks by frame id, so `frames.size` shows
// whether the hook's loop is running (1) or stopped (0).
let frames: Map<number, FrameRequestCallback>
let nextFrameId: number

/**
 * Simulates one animation frame: runs every pending callback once. The queue
 * is emptied first, so a callback that requests the next frame (as the hook's
 * loop does) queues it for the following runFrame() instead of this one.
 */
function runFrame() {
  const callbacks = [...frames.values()]
  frames.clear()
  act(() => {
    for (const callback of callbacks) callback(performance.now())
  })
}

// Swap in fake requestAnimationFrame/cancelAnimationFrame that only touch `frames`.
beforeEach(() => {
  frames = new Map()
  nextFrameId = 1
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrameId++
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Renders the hook and counts renders, to check it doesn't re-render needlessly. */
function renderActiveCue(media: MediaTarget | null, initialCues: readonly Cue[] = cues) {
  let renders = 0
  const hook = renderHook(
    ({ media, cues }) => {
      renders++
      return useActiveCueIndex(media, cues)
    },
    { initialProps: { media, cues: initialCues } },
  )
  return { ...hook, renders: () => renders }
}

describe('useActiveCueIndex', () => {
  test('returns -1 without a media element', () => {
    const { result } = renderActiveCue(null)
    expect(result.current).toBe(-1)
  })

  test('reads the current time on mount', () => {
    const { video, clock } = createVideo()
    clock.time = 3
    const { result } = renderActiveCue(video)
    expect(result.current).toBe(1)
  })

  test('updates on seeked, timeupdate and loadedmetadata', () => {
    const { video, clock, dispatch } = createVideo()
    const { result } = renderActiveCue(video)
    expect(result.current).toBe(0)

    clock.time = 6.5
    dispatch('seeked')
    expect(result.current).toBe(2)

    clock.time = 5
    dispatch('timeupdate')
    expect(result.current).toBe(-1)

    clock.time = 2
    dispatch('loadedmetadata')
    expect(result.current).toBe(1)
  })

  test('does not re-render while the index is unchanged', () => {
    const { video, clock, dispatch } = createVideo()
    const { result, renders } = renderActiveCue(video)
    const before = renders()

    for (const time of [0.5, 1, 1.5, 1.999]) {
      clock.time = time
      dispatch('timeupdate')
    }
    expect(result.current).toBe(0)
    expect(renders()).toBe(before)

    clock.time = 2
    dispatch('timeupdate')
    expect(result.current).toBe(1)
    expect(renders()).toBe(before + 1)
  })

  test('reads the time every frame while playing', () => {
    const { video, clock, dispatch } = createVideo()
    const { result, renders } = renderActiveCue(video)
    expect(frames.size).toBe(0)

    clock.paused = false
    dispatch('playing')
    expect(frames.size).toBe(1)

    const before = renders()
    clock.time = 1
    runFrame()
    clock.time = 1.5
    runFrame()
    expect(result.current).toBe(0)
    expect(renders()).toBe(before)

    clock.time = 2.1
    runFrame()
    expect(result.current).toBe(1)
    expect(renders()).toBe(before + 1)
    expect(frames.size).toBe(1)
  })

  test('starts the frame loop on mount if already playing', () => {
    const { video, clock } = createVideo()
    clock.paused = false
    renderActiveCue(video)
    expect(frames.size).toBe(1)
  })

  test('a second playing event does not start a second loop', () => {
    const { video, clock, dispatch } = createVideo()
    renderActiveCue(video)
    clock.paused = false
    dispatch('playing')
    dispatch('playing')
    expect(frames.size).toBe(1)
  })

  test.each(['pause', 'ended'])('stops the frame loop on %s and reads the final time', (eventType) => {
    const { video, clock, dispatch } = createVideo()
    const { result } = renderActiveCue(video)
    clock.paused = false
    dispatch('playing')

    clock.time = 3
    clock.paused = true
    dispatch(eventType)
    expect(frames.size).toBe(0)
    expect(result.current).toBe(1)
  })

  test('stops the frame loop and listening on unmount', () => {
    const { video, clock, dispatch } = createVideo()
    const { result, unmount } = renderActiveCue(video)
    clock.paused = false
    dispatch('playing')
    expect(frames.size).toBe(1)

    unmount()
    expect(frames.size).toBe(0)

    clock.time = 6.5
    dispatch('seeked')
    dispatch('playing')
    expect(frames.size).toBe(0)
    expect(result.current).toBe(0)
  })

  test('recomputes when the cues change', () => {
    const { video, clock } = createVideo()
    clock.time = 3
    const { result, rerender } = renderActiveCue(video)
    expect(result.current).toBe(1)

    rerender({ media: video, cues: [{ id: 'x', start: 2.5, end: 10, text: 'X' }] })
    expect(result.current).toBe(0)
  })

  test('switches to a new media element', () => {
    const first = createVideo()
    const second = createVideo()
    second.clock.time = 7
    const { result, rerender } = renderActiveCue(first.video)
    expect(result.current).toBe(0)

    rerender({ media: second.video, cues })
    expect(result.current).toBe(2)

    first.clock.time = 3
    first.dispatch('seeked')
    expect(result.current).toBe(2)
  })

  test('returns -1 when the media element is removed', () => {
    const { video } = createVideo()
    const { result, rerender } = renderActiveCue(video)
    expect(result.current).toBe(0)

    rerender({ media: null, cues })
    expect(result.current).toBe(-1)
  })
})
