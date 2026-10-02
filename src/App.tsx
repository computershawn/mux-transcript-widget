import { useState } from 'react'
import type { CSSProperties } from 'react'
import { thumbnailUrl } from './transcript/lib/muxUrls.ts'
import { TranscriptWidget } from './transcript/TranscriptWidget.tsx'
import { VIDEOS } from './videos.ts'
import { VideoPicker } from './VideoPicker.tsx'
import type { PickerVideo } from './VideoPicker.tsx'

const ACCENT_COLOR = '#6600ff'
const WIDGET_WIDTH = 960

const PICKER_VIDEOS: PickerVideo[] = VIDEOS.map((video) => ({
  id: video.playbackId,
  title: video.title,
  thumbnailUrl: thumbnailUrl(video.playbackId, { width: 480 }),
}))

/** Demo page: the widget, with a picker of videos under it. */
function App() {
  const [selectedId, setSelectedId] = useState(VIDEOS[0]?.playbackId)
  const video = VIDEOS.find((candidate) => candidate.playbackId === selectedId)

  if (!video) {
    return (
      <main>
        <h1>Transcript Widget with Mux Video</h1>
        <p>
          Add a video to <code>src/videos.ts</code> to try the widget.
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Transcript Widget with Mux Video</h1>
      {/* --tw-accent here, not just on the widget, so the picker shares it. */}
      <div style={{ maxWidth: WIDGET_WIDTH, '--tw-accent': ACCENT_COLOR } as CSSProperties}>
        {/* Keyed so each video gets a fresh widget: auto-scroll unpaused, the
            transcript scrolled to the top and the poster back. */}
        <TranscriptWidget
          key={video.playbackId}
          playbackId={video.playbackId}
          trackId={video.trackId}
          accentColor={ACCENT_COLOR}
          metadata={{ video_title: video.title }}
        />
        <VideoPicker videos={PICKER_VIDEOS} selectedId={selectedId} onSelect={setSelectedId} />
        <ul className="credits" aria-label="Video credits">
          {VIDEOS.map(({ playbackId, title, credit }) => (
            <li key={playbackId}>
              {title}: {credit}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

export default App
