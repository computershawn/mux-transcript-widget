import MuxPlayer from '@mux/mux-player-react'
import type { MuxPlayerProps, MuxPlayerRefAttributes } from '@mux/mux-player-react'
import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useActiveCueIndex } from './hooks/useActiveCueIndex.ts'
import { useVttCues } from './hooks/useVttCues.ts'
import { vttUrl as muxVttUrl } from './lib/muxUrls.ts'
import { TranscriptPanel } from './TranscriptPanel.tsx'
import styles from './TranscriptWidget.module.css'

/** Added to a cue's start when seeking to it, so floating-point error can't
 * land the time on the previous cue's end and highlight that cue instead. */
const SEEK_OFFSET = 0.001

export type TranscriptWidgetProps = Omit<MuxPlayerProps, 'playbackId' | 'className' | 'style'> & {
  playbackId: string
  /** ID of the asset's text track, from the Mux Asset API's `tracks[]`. */
  trackId: string
  /** Fetch the transcript from here instead of Mux's URL for `trackId`. */
  vttUrl?: string
  /** Colors both the player's controls and the transcript (`--tw-accent`). */
  accentColor?: string
  /** Applied to the widget's root element, e.g. to set `--tw-*` theme variables. */
  className?: string
  style?: CSSProperties
}

/**
 * A Mux Player with a synced transcript beside it (or below it, when the
 * widget is under 700px wide). The active cue is highlighted and kept in view,
 * and clicking a line seeks to it. Other props go to the player.
 */
export function TranscriptWidget({
  playbackId,
  trackId,
  vttUrl,
  accentColor,
  className,
  style,
  ...playerProps
}: TranscriptWidgetProps) {
  // The element is kept in state, so the hooks re-subscribe if it changes,
  // and in a ref for seeking, since state values mustn't be mutated.
  const [player, setPlayer] = useState<MuxPlayerRefAttributes | null>(null)
  const playerRef = useRef<MuxPlayerRefAttributes | null>(null)
  const attachPlayer = useCallback((element: MuxPlayerRefAttributes | null) => {
    playerRef.current = element
    setPlayer(element)
  }, [])

  const { status, cues, error } = useVttCues(vttUrl ?? muxVttUrl(playbackId, trackId))
  const activeIndex = useActiveCueIndex(player, cues)

  const handleSeek = useCallback((time: number) => {
    if (playerRef.current) playerRef.current.currentTime = time + SEEK_OFFSET
  }, [])

  // Mux Player takes its accent from a prop, not an inherited variable, so
  // the one prop sets both.
  const rootStyle = accentColor ? ({ ...style, '--tw-accent': accentColor } as CSSProperties) : style

  return (
    <div className={className ? `${styles.widget} ${className}` : styles.widget} style={rootStyle}>
      <div className={styles.layout}>
        <MuxPlayer
          {...playerProps}
          ref={attachPlayer}
          className={styles.player}
          playbackId={playbackId}
          accentColor={accentColor}
        />
        <div className={styles.panel}>
          <TranscriptPanel
            status={status}
            cues={cues}
            error={error}
            activeIndex={activeIndex}
            onSeek={handleSeek}
          />
        </div>
      </div>
    </div>
  )
}
