import { useState } from 'react'
import type { CSSProperties } from 'react'
import { TranscriptWidget } from './transcript/TranscriptWidget.tsx'
import { VideoPicker } from './VideoPicker.tsx'
import type { PickerVideo } from './VideoPicker.tsx'

const playbackId = import.meta.env.VITE_MUX_PLAYBACK_ID
const trackId = import.meta.env.VITE_MUX_TRACK_ID

const ACCENT_COLOR = '#6600ff'
const WIDGET_WIDTH = 960

/** Placeholder entries for settling the picker's look; real videos come later. */
const DUMMY_VIDEOS: PickerVideo[] = [
  'Getting started with Mux Video',
  'Building a synced transcript',
  'A much longer title, to check how the picker truncates text that runs past two lines',
  'Theming with CSS custom properties',
  'Container queries in practice',
  'Short',
].map((title, i) => ({
  id: `dummy-${i}`,
  title,
  thumbnailUrl: `https://picsum.photos/seed/mux-${i}/320/180`,
}))

/** Demo page: the widget, with a picker of videos under it. */
function App() {
  const [selectedId, setSelectedId] = useState(DUMMY_VIDEOS[0]?.id)

  if (!playbackId || !trackId) {
    return (
      <main>
        <h1>Transcript Widget with Mux Video</h1>
        <p>
          Set <code>VITE_MUX_PLAYBACK_ID</code> and <code>VITE_MUX_TRACK_ID</code> in{' '}
          <code>.env.local</code> (see <code>.env.example</code>), then restart the dev server.
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Transcript Widget with Mux Video</h1>
      {/* --tw-accent here, not just on the widget, so the picker shares it. */}
      <div style={{ maxWidth: WIDGET_WIDTH, '--tw-accent': ACCENT_COLOR } as CSSProperties}>
        <TranscriptWidget
          playbackId={playbackId}
          trackId={trackId}
          accentColor={ACCENT_COLOR}
          metadata={{ video_title: 'Transcript widget demo' }}
        />
        <VideoPicker videos={DUMMY_VIDEOS} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </main>
  )
}

export default App
