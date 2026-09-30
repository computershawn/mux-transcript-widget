import { memo } from 'react'
import { formatTime } from './lib/formatTime.ts'
import type { Cue } from './types.ts'
import styles from './TranscriptPanel.module.css'

interface TranscriptLineProps {
  cue: Cue
  active: boolean
  onSeek: (time: number) => void
}

/** One cue as a button that seeks to its start. Memoized so a change of
 * active cue only re-renders the two lines whose `active` flips. */
export const TranscriptLine = memo(function TranscriptLine({ cue, active, onSeek }: TranscriptLineProps) {
  return (
    <li>
      <button
        type="button"
        className={styles.line}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSeek(cue.start)}
      >
        <span className={styles.time}>{formatTime(cue.start)}</span>
        <span className={styles.text}>{cue.text}</span>
      </button>
    </li>
  )
})
