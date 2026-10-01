import { useEffect, useState } from 'react'
import { findActiveCue } from '../lib/findActiveCue.ts'
import type { Cue } from '../types.ts'

/** What the hook needs from a player: a `<video>`, or Mux Player's element. */
export type MediaTarget = EventTarget & {
  readonly currentTime: number
  readonly paused: boolean
}

type ComputedIndex = { media: MediaTarget | null; cues: readonly Cue[]; index: number }

/** Events after which the time may have jumped or been read for the first time. */
const SYNC_EVENTS = ['seeked', 'timeupdate', 'loadedmetadata'] as const
const STOP_EVENTS = ['pause', 'ended'] as const

/**
 * Returns the index of the cue active at `media`'s current time, or -1.
 *
 * `timeupdate` only fires about 4 times a second, so while playing the time is
 * read every animation frame instead. State is only set when the index
 * changes, so the caller re-renders once per cue, not once per frame.
 */
export function useActiveCueIndex(media: MediaTarget | null, cues: readonly Cue[]): number {
  // The index is stored with the media and cues it was computed for, so after
  // either changes the hook reads -1 until the effect recomputes it, rather
  // than briefly returning an index into the old cues.
  const [computed, setComputed] = useState<ComputedIndex>({ media: null, cues, index: -1 })

  useEffect(() => {
    if (!media) return

    // Pending animation frame id; 0 while the loop isn't running.
    let frame = 0
    // Starts undefined so the first sync always stores a result.
    let lastIndex: number | undefined

    /** Reads the time and stores the index, if it changed. */
    const sync = () => {
      const index = findActiveCue(cues, media.currentTime)
      if (index !== lastIndex) {
        lastIndex = index
        setComputed({ media, cues, index })
      }
    }
    /** One frame of the loop: sync, then schedule the next frame. */
    const tick = () => {
      sync()
      frame = requestAnimationFrame(tick)
    }
    /** Starts the loop unless it's already running. */
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    /** Stops the loop and reads the time the media stopped at. */
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      sync()
    }

    media.addEventListener('playing', start)
    for (const eventType of STOP_EVENTS) media.addEventListener(eventType, stop)
    for (const eventType of SYNC_EVENTS) media.addEventListener(eventType, sync)

    sync()
    // Already playing when subscribed, so no 'playing' event is coming.
    if (!media.paused) start()

    return () => {
      cancelAnimationFrame(frame)
      media.removeEventListener('playing', start)
      for (const eventType of STOP_EVENTS) media.removeEventListener(eventType, stop)
      for (const eventType of SYNC_EVENTS) media.removeEventListener(eventType, sync)
    }
  }, [media, cues])

  return media && computed.media === media && computed.cues === cues ? computed.index : -1
}
