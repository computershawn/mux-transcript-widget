import { useEffect, useState } from 'react'
import { parseVtt } from '../lib/parseVtt.ts'
import type { Cue } from '../types.ts'

export type VttCuesState =
  | { status: 'loading'; cues: Cue[]; error: null }
  | { status: 'ready'; cues: Cue[]; error: null }
  | { status: 'error'; cues: Cue[]; error: Error }

type Result = { url: string; cues: Cue[]; error: Error | null }

const NO_CUES: Cue[] = []
const LOADING: VttCuesState = { status: 'loading', cues: NO_CUES, error: null }

/**
 * Fetches and parses the WebVTT file at `url`. The request is aborted when
 * `url` changes or the component unmounts, and a response for any URL other
 * than the current one is ignored.
 */
export function useVttCues(url: string): VttCuesState {
  // Results are keyed by URL, so a new URL reads as loading until its own
  // result arrives, without resetting state inside the effect.
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to load transcript (HTTP ${response.status})`)
        }
        const cues = parseVtt(await response.text())
        if (!controller.signal.aborted) setResult({ url, cues, error: null })
      } catch (err) {
        if (controller.signal.aborted) return
        const error = err instanceof Error ? err : new Error(String(err))
        setResult({ url, cues: NO_CUES, error })
      }
    }

    void load()
    return () => controller.abort()
  }, [url])

  if (result?.url !== url) return LOADING
  if (result.error) return { status: 'error', cues: NO_CUES, error: result.error }
  return { status: 'ready', cues: result.cues, error: null }
}
