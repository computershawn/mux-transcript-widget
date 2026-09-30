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

/** Presentational transcript: the scrollable list of cues, or a loading,
 * error or empty message. */
export function TranscriptPanel(props: TranscriptPanelProps) {
  return (
    <section className={styles.panel} aria-label="Transcript">
      <div className={styles.scroller}>
        <TranscriptBody {...props} />
      </div>
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
