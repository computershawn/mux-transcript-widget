import { useState } from 'react'
import { TranscriptWidget } from './transcript/TranscriptWidget.tsx'

const playbackId = import.meta.env.VITE_MUX_PLAYBACK_ID
const trackId = import.meta.env.VITE_MUX_TRACK_ID

const DEFAULT_ACCENT = '#fa50b5'
/** Widths to try the widget at; under 700px it stacks. */
const WIDTHS = [320, 480, 640, 800, 960, 1120]

/** Demo page: the widget, plus controls for checking the stacked layout and
 * the accent color by hand. */
function App() {
  const [width, setWidth] = useState(960)
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT)

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
      <form className="controls" onSubmit={(event) => event.preventDefault()}>
        <label>
          Widget width
          <select value={width} onChange={(event) => setWidth(Number(event.target.value))}>
            {WIDTHS.map((value) => (
              <option key={value} value={value}>
                {value}px
              </option>
            ))}
          </select>
        </label>
        <label>
          Accent color
          <input
            type="color"
            value={accentColor}
            onChange={(event) => setAccentColor(event.target.value)}
          />
        </label>
      </form>
      <div style={{ maxWidth: width }}>
        <TranscriptWidget
          playbackId={playbackId}
          trackId={trackId}
          accentColor={accentColor}
          metadata={{ video_title: 'Transcript widget demo' }}
        />
      </div>
    </main>
  )
}

export default App
