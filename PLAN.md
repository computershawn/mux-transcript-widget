# Plan: Video playlist for the demo page

## Context
The demo page (`src/App.tsx`) plays one video, whose IDs come from `VITE_MUX_PLAYBACK_ID` and `VITE_MUX_TRACK_ID`. We're replacing that with a list of videos:
- The first video in the list loads on mount.
- Clicking a video's thumbnail loads that video and its transcript.

We build the picker's look first with dummy content and settle it, then wire up the real data and switching.

The transcript widget itself was built under an earlier plan, now in `docs/plans/transcript-widget.md`.

## What the widget already handles
The widget needs no changes to switch videos:
- `useVttCues` keys its results by URL, aborts the old fetch and ignores stale responses. A new `trackId` shows loading, then the new transcript.
- `MuxPlayer` loads the new source when `playbackId` changes, and `useActiveCueIndex` recomputes the active cue when `cues` changes.

Some state would carry over from the previous video: whether `useAutoScroll` has auto-scroll paused, and the panel's scroll position. The demo renders `<TranscriptWidget key={playbackId} …>`, so each video gets a fresh widget.

## Design
- **`VideoPicker`** (`src/VideoPicker.tsx` + `VideoPicker.module.css`): part of the demo, not of `src/transcript/`. It's a grid of `<button>`s, each showing a thumbnail (`<img alt="">`) with the title as the button's label. The selected one has `aria-pressed="true"`, and the CSS styles the highlight from that attribute, as the transcript does with `aria-current`. Props: `videos` (`{ id, title, thumbnailUrl }[]`), `selectedId`, `onSelect(id)`. The picker takes ready-made thumbnail URLs rather than building them, so it doesn't depend on Mux; `App` maps `VIDEOS` to that shape. The selected state uses `--tw-accent`, which the demo sets on the element wrapping both the widget and the picker, so both share one accent.
- **Video list:** `src/videos.ts` exports `VIDEOS: Video[]`, where each `Video` is `{ playbackId, trackId, title, credit }`. Playback is public, so the IDs aren't secrets and are committed. The page lists each video's `credit` under the picker, since the Blender films are CC BY.
- **Thumbnails:** `thumbnailUrl(playbackId, { width })` in `src/transcript/lib/muxUrls.ts` returns `https://image.mux.com/{playbackId}/thumbnail.webp?width=…`, plus `&time=…` when given (without it, Mux uses the middle of the video).

## Delivery
Each step below ships as its own PR into `feature/video-playlist`, one at a time, following the workflow in `CLAUDE.md`. Once all steps are merged, `feature/video-playlist` merges into `main` through one final PR.

| Step | Branch | Status |
|---|---|---|
| 0 | `playlist/plan-and-workflow` | Merged (#14) |
| 1 | `playlist/s1-picker-ui` | Merged (#15) |
| 2 | `playlist/s2-switching` | In review |
| Final merge into `main` | `feature/video-playlist` | Not started |

Update the Status column in each step's PR.

## Steps
0. **Plan + workflow docs:**
   - Move the widget's plan to `docs/plans/transcript-widget.md` and add this plan.
   - Make `CLAUDE.md`'s workflow section independent of any one feature's branch names.
   - Point the README at both plans.
1. **Picker look, with dummy content:**
   - Add `VideoPicker` and its CSS, and render it in `App.tsx` under the existing widget, which still reads the env vars.
   - Feed it a hard-coded list of 6 dummy entries, with placeholder titles (one long, one short) and `picsum.photos` images as thumbnails. One starts selected; clicking another only moves the highlight.
   - Settle the look in the browser:
     - layout under the player, and how it wraps at narrow widths
     - thumbnail size
     - truncation of long titles
     - the selected, hover and focus-visible states
   - Remove the demo's width dropdown and accent color picker: the widget is capped at 960px wide (narrower windows still shrink it) and the accent is hard-coded to `#6600ff`.
   - Tests: there's one button per video, labelled with its title; only the selected one has `aria-pressed="true"`; and clicking one calls `onSelect` with its ID.
2. **Real data + switching:**
   - Add `src/videos.ts` with real assets, plus `thumbnailUrl` with tests in `muxUrls.test.ts`. Replace the dummy list with `VIDEOS` mapped to the picker's shape.
   - The videos: Tears of Steel (already in the Mux account), plus two assets created for the demo with public playback, `basic` video quality and auto-generated English captions:
     - Elephants Dream (Blender, CC BY 2.5), from `download.blender.org`
     - SIGGRAPH Daily 2015 (NASA Scientific Visualization Studio, public domain), from Wikimedia Commons
   - Under the picker, list each video's credit line.
   - `App` keeps the selected playback ID in state, starting at `VIDEOS[0]`. It passes that video's IDs and title (`metadata.video_title`) to `<TranscriptWidget key={playbackId}>`. `onSelect` updates the state.
   - Remove the env vars: `.env.example`, their types in `src/vite-env.d.ts`, the setup screen in `App.tsx` and the README's setup instructions. If the list is empty, the page shows a short message instead.
   - Tests: in `TranscriptWidget.test.tsx`, rerendering with a new `trackId` fetches the new VTT and shows its cues.

## Verification
- After every step, `npm test` passes and `npm run lint` and `npm run build` are clean.
- Step 1: with `npm run dev`, check the picker at full width and in a narrow window, and tab through the thumbnails to check the focus styles.
- Step 2: with `npm run dev` and 2–3 real public assets:
  - The first video loads on mount.
  - Clicking another thumbnail swaps both the video and the transcript.
  - The highlight follows the new video's playback.
  - Auto-scroll isn't left paused from the previous video.
