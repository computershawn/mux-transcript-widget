import { useCallback, useState } from 'react'
import { useAutoScroll } from './hooks/useAutoScroll.ts'
import { TranscriptLine } from './TranscriptLine.tsx'
import type { Cue } from './types.ts'
import styles from './TranscriptPanel.module.css'

export interface TranscriptPanelProps {
  status: 'loading' | 'ready' | 'error'
  cues: readonly Cue[]
  error?: Error | null
  /** Index into `cues` of the active cue, or -1 for none. */
  activeIndex: number
  /** Called with the clicked cue's start time, in seconds. Keep it stable
   * (e.g. `useCallback`) so lines don't all re-render. */
  onSeek: (time: number) => void
}

/** Transcript: the scrollable list of cues, or a loading, error or empty
 * message. Keeps the active line in view unless the user is scrolling, and
 * offers a button to resume. */
export function TranscriptPanel(props: TranscriptPanelProps) {
  const { activeIndex, onSeek } = props
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const { paused, resume, hold, release } = useAutoScroll(scroller, activeIndex)

  // Seeking to a line also resumes auto-scroll. No scroll now: the active
  // line is about to change, and auto-scroll follows it when it does.
  const handleSeek = useCallback(
    (time: number) => {
      resume({ scroll: false })
      onSeek(time)
    },
    [resume, onSeek],
  )

  // The button unmounts once resumed, so move focus into the transcript
  // rather than letting it drop to the page.
  const handleResume = () => {
    resume()
    const target = scroller?.querySelector<HTMLElement>('[aria-current="true"]') ?? scroller
    target?.focus({ preventScroll: true })
  }

  return (
    <section className={styles.panel} aria-label="Transcript">
      {/* tabIndex -1: focusable by script, for when no line is active. */}
      <div ref={setScroller} className={styles.scroller} tabIndex={-1}>
        <TranscriptBody {...props} onSeek={handleSeek} />
      </div>
      {paused && (
        // While focused, stay paused: the user is about to press it.
        <button
          type="button"
          className={styles.resume}
          onClick={handleResume}
          onFocus={hold}
          onBlur={release}
        >
          Resume auto-scroll
        </button>
      )}
    </section>
  )
}

/** The panel's contents for the current status. */
function TranscriptBody({ status, cues, error, activeIndex, onSeek }: TranscriptPanelProps) {
  if (status === 'loading') {
    return (
      <p className={styles.message} role="status">
        Loading transcript…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <p className={styles.message} role="alert">
        Couldn't load the transcript.
        {error && <span className={styles.detail}>{error.message}</span>}
      </p>
    )
  }
  if (cues.length === 0) {
    return <p className={styles.message}>No transcript available.</p>
  }
  return (
    <ol className={styles.list}>
      {cues.map((cue, i) => (
        <TranscriptLine key={cue.id} cue={cue} active={i === activeIndex} onSeek={onSeek} />
      ))}
    </ol>
  )
}
