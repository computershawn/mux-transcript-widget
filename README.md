# Mux transcript widget

A React component that shows a [Mux Player](https://www.mux.com/docs/guides/mux-player-web) with a synced transcript beside it.

- The line being spoken is highlighted as the video plays.
- Clicking a line seeks the video to it.
- The transcript scrolls to keep the active line in view. Scrolling it yourself pauses that; it resumes after 4 seconds, when you click "Resume auto-scroll", or when you click a line.
- When the widget is narrower than 700px, the transcript stacks under the player.

The transcript is the asset's WebVTT text track, fetched in full from `https://stream.mux.com/{playbackId}/text/{trackId}.vtt`. Playback must be public; signed playback isn't supported.

## Running the demo

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_MUX_PLAYBACK_ID`: a public playback ID.
   - `VITE_MUX_TRACK_ID`: the ID of one of the asset's text tracks (see [Finding the track ID](#finding-the-track-id)).
3. `npm run dev`, then open the URL it prints.

The demo page shows the widget at up to 960px wide, with a `#6600ff` accent.

## Using the widget

```tsx
import { TranscriptWidget } from './transcript/TranscriptWidget.tsx'

<TranscriptWidget
  playbackId="..."
  trackId="..."
  accentColor="#fa50b5"
  metadata={{ video_title: 'My video' }}
/>
```

| Prop | Description |
|---|---|
| `playbackId` | The asset's public playback ID. Required. |
| `trackId` | The ID of the text track to show as the transcript. Required. |
| `vttUrl` | Fetch the transcript from this URL instead of Mux's URL for `trackId`. |
| `accentColor` | Colors both the player's controls and the transcript's highlight. |
| `className`, `style` | Applied to the widget's root element, e.g. to set the theme variables below. |
| Anything else | Passed through to Mux Player (`metadata`, `startTime`, `defaultHiddenCaptions`, …). |

Mux Player also shows the captions on the video by default; pass `defaultHiddenCaptions` if the transcript is enough.

### Theming

Set these CSS custom properties on the widget or any ancestor. Each has a built-in default, so set only the ones you need.

| Variable | Default | Controls |
|---|---|---|
| `--tw-accent` | `#fa50b5` | Highlight bar, focus rings, resume button (also set by `accentColor`) |
| `--tw-active-bg` | accent at 16% | Background of the active line |
| `--tw-panel-bg` | `transparent` | Transcript panel background |
| `--tw-font` | inherited | Transcript font |
| `--tw-radius` | `8px` | Corner radius of the player, panel and lines |
| `--tw-stacked-panel-height` | `320px` | Transcript height in the stacked layout |

### Layout

The widget fills the width it's given. Side by side, the player takes two-thirds and the transcript one-third, and the transcript matches the player's height.

The widget's root is a CSS size container, so it can't size itself to its content. Give it a width (normal block layout does), not a spot that shrinks to fit, such as an inline-block, a float, or an `auto` flex or grid track, where it collapses to zero width.

### Finding the track ID

Text track IDs come from the [Mux Asset API](https://www.mux.com/docs/api-reference), which needs your secret API credentials, so the widget doesn't look them up itself. From a server or your terminal:

1. `GET https://api.mux.com/video/v1/playback-ids/{PLAYBACK_ID}` returns the asset ID in `data.object.id`.
2. `GET https://api.mux.com/video/v1/assets/{ASSET_ID}` lists the asset's tracks in `data.tracks`. Use the `id` of one whose `type` is `"text"`.

Both use HTTP Basic auth with an access token ID and secret from the Mux dashboard.

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Run the tests once (`npm run test:watch` to watch) |
| `npm run lint` | Lint with Oxlint |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the built `dist/` |

Run a single test with `npx vitest run src/path/file.test.ts -t "test name"`.

Mux Player makes the bundle about 1.3 MB minified, so the build warns about chunk size. If that matters, `@mux/mux-player-react/lazy` loads the player on demand.

### Code layout

```
src/
  App.tsx                     demo page
  transcript/
    TranscriptWidget.tsx      the player and transcript, wired together
    TranscriptPanel.tsx       scrollable transcript, resume button
    TranscriptLine.tsx        one line (a button that seeks)
    hooks/
      useVttCues.ts           fetch and parse the .vtt
      useActiveCueIndex.ts    which cue is active, from the player's time
      useAutoScroll.ts        keep the active line in view, pause on manual scroll
    lib/
      parseVtt.ts             WebVTT text -> cues
      findActiveCue.ts        binary search for the cue at a time
      muxUrls.ts              Mux text-track URL
      formatTime.ts           seconds -> m:ss / h:mm:ss
```

`docs/plans/transcript-widget.md` has the widget's design decisions and the history of how it was built. `PLAN.md` is the plan for the work in progress.
