# Plan: Mux player + synced transcript widget

## Context
The repo is an unmodified Vite React-TS template (see `CLAUDE.md`). We're building a widget with a Mux player and a transcript panel beside it:
- The active cue is highlighted and stays in sync with playback.
- Clicking a line seeks the video to that cue.
- Auto-scroll pauses while the user scrolls the panel manually.

The transcript comes from the asset's Mux WebVTT text track. Decisions made:
- **Transcript source:** fetch the whole `.vtt` from `https://stream.mux.com/{playbackId}/text/{trackId}.vtt`, with an optional `vttUrl` override. We don't read the player's `textTracks` because hls.js only loads subtitle segments as playback reaches them, so the full transcript wouldn't be available up front.
- **Playback:** public, so no tokens are needed.

## Component / module breakdown
```
src/transcript/
  lib/parseVtt.ts          pure: string -> Cue[] {id, start, end, text}
  lib/findActiveCue.ts     pure: (cues, time) -> index | -1   (binary search)
  lib/muxUrls.ts           pure: vttUrl(playbackId, trackId)
  hooks/useVttCues.ts      fetch + parse; {status, cues, error}; AbortController on change/unmount
  hooks/useActiveCueIndex.ts  subscribes to a media element; returns the active cue index
  hooks/useAutoScroll.ts   scrolls the active line into view unless the user is scrolling
  TranscriptPanel.tsx      presentational: cues, activeIndex, onSeek; owns scroll container + "Resume auto-scroll" button
  TranscriptLine.tsx       memoized <button> per cue; aria-current when active; shows timestamp
  TranscriptWidget.tsx     layout; renders <MuxPlayer> (@mux/mux-player-react) + panel; wires ref, time, seek
```
Props for `TranscriptWidget`: `playbackId`, `trackId`, optional `vttUrl` and `accentColor`, and pass-through player props such as `metadata`. `className` and `style` apply to the widget's root (e.g. to set the `--tw-*` variables), not the player.

## Styling
- **CSS Modules** (built into Vite, nothing to install): `TranscriptWidget.module.css` for layout and theme variables, `TranscriptPanel.module.css` for lines, the highlight and the resume button. Scoped class names keep the widget's CSS and the host page's CSS from colliding. The demo keeps a minimal global `index.css`; the template's `App.css` is deleted.
- **Theme via custom properties** on the widget root or any ancestor: `--tw-accent`, `--tw-active-bg`, `--tw-panel-bg`, `--tw-font`, `--tw-radius`, `--tw-stacked-panel-height`. Defaults live in `var()` fallbacks so a host's values always win. Mux Player reads its accent from its own shadow-DOM theme, not from an inherited variable, so the widget's `accentColor` prop sets both the player's `accentColor` and `--tw-accent`.
- **Active-line style** comes from `[aria-current="true"]`, not a separate class, so the visual and accessibility state can't drift apart.
- **Layout:** the root sets `container-type: inline-size`. By default it's a two-column grid (player 2fr, panel 1fr) with the player's height set by `aspect-ratio: 16/9`. The panel's wrapper has `contain: size`, so the player alone sets the row height and the panel scrolls inside it with no JavaScript measuring. `@container (width < 700px)` stacks the player and panel, driven by the widget's own width rather than the screen's; stacked, the panel is `--tw-stacked-panel-height` tall (default 320px).
- **Reduced motion:** smooth scrolling only under `prefers-reduced-motion: no-preference`. `useAutoScroll` reads the same media query to choose `behavior: 'smooth' | 'auto'`.

## Time → cue sync
- **Time source (`useActiveCueIndex`):** `timeupdate` only fires about 4 times a second, which makes the highlight lag. Instead:
  - While `playing`, read `currentTime` in a `requestAnimationFrame` loop. Stop the loop on `pause` or `ended`.
  - On `pause`, `ended`, `seeked`, `timeupdate` and `loadedmetadata`, read it once.
  - Only call `setState` when the active cue *index* changes, not on every frame. To do that, compute the index inside the loop (the hook takes the cues and returns `activeIndex`) so the panel doesn't re-render at 60fps.
- **Lookup (`findActiveCue`):**
  - Cues are sorted by start time. Binary search for the last cue with `start <= t`; it's active if `t < end`.
  - In a gap between cues, return -1 (no highlight).
  - If cues overlap, the one with the latest start wins.
  - Search runs in O(log n); memoize on cues.
- **Seek:** clicking a line sets `player.currentTime = cue.start + 0.001`. The small offset avoids landing exactly on a boundary and highlighting the previous cue due to floating-point error. It doesn't auto-play, but it does resume auto-scroll.

## Auto-scroll pause
- **Programmatic scroll:** `container.scrollTo({top, behavior:'smooth'})`, with the offset computed so the active line sits about a third of the way down. We don't use `scrollIntoView`, because it also scrolls ancestor elements and the page.
- **Detecting manual scrolling:** listen for user-intent events on the container: `wheel`, `touchmove` (not `touchstart`, so a tap on a line doesn't pause), `pointerdown` on the container itself (its scrollbar or padding, not a line), and scroll keys (arrows, Page Up/Down, Home/End, and Space when the container itself has focus). We deliberately don't use the `scroll` event, because our own programmatic scrolls fire it too. Any of these sets `paused = true`.
- **Resuming:** after 4s of no user-intent events, or when the user clicks "Resume auto-scroll" or a transcript line.
  - The resume button scrolls to the active line straight away and moves focus to it (or to the scroll area if no line is active), since the button unmounts.
  - Clicking a line resumes without scrolling; the scroll happens when the seek changes the active line, so the panel doesn't first jump back to the old one.
  - While the resume button has focus the 4s timeout is held, so it can't vanish from under a keyboard user; it restarts on blur.
- If the user never scrolls, the active line stays in view.

## Delivery
Each step below ships as its own PR into `feature/transcript-widget`, one at a time, following the workflow in `CLAUDE.md`. Once all steps are merged, `feature/transcript-widget` merges into `main` through one final PR.

| Step | Branch | Status |
|---|---|---|
| Plan + workflow docs | `transcript/plan-and-workflow` | Merged (#2) |
| 0 | `transcript/s0-test-tooling` | Merged (#3) |
| 1 | `transcript/s1-parse-vtt` | Merged (#4) |
| 2 | `transcript/s2-find-active-cue` | Merged (#5) |
| 3 | `transcript/s3-vtt-fetch` | Merged (#6) |
| 4 | `transcript/s4-transcript-panel` | Merged (#7) |
| 5 | `transcript/s5-active-cue-sync` | Merged (#8) |
| 6 | `transcript/s6-auto-scroll` | Merged (#9) |
| 7 | `transcript/s7-widget` | Merged (#10) |
| 8 | `transcript/s8-demo` | Merged (#11) |
| Final merge into `main` | `feature/transcript-widget` | Merged (#12) |

Update the Status column in each step's PR.

## Steps (each independently testable)

0. **Test tooling:** add `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom`, plus a `test` script and vitest config. Update `CLAUDE.md` with test commands, including running a single test: `npx vitest run path -t name`.
1. **`parseVtt`** + tests:
   - `WEBVTT` header, including BOM and header text
   - `mm:ss.ttt` and `hh:mm:ss.ttt` timestamps
   - cue identifiers
   - cue settings after the timestamp
   - multi-line text
   - `NOTE`/`STYLE`/`REGION` blocks skipped
   - `<v Speaker>` and other tags stripped, HTML entities decoded
   - CRLF line endings
   - malformed blocks skipped rather than throwing
2. **`findActiveCue`** + tests: before the first cue, exact start/end boundaries, gaps, overlapping cues, after the last cue, empty list.
3. **`muxUrls` + `useVttCues`** + tests (mocked `fetch`): loading → ready, HTTP error → error state, the request is aborted when the URL changes, and a late response from a stale URL is ignored.
4. **`TranscriptPanel` / `TranscriptLine`** (presentational), plus a `formatTime` helper for the timestamps, + tests: renders the lines, highlights `aria-current` for `activeIndex`, clicking calls `onSeek(cue.start)`, loading/error/empty states. Add `TranscriptPanel.module.css`, with the highlight keyed on `[aria-current="true"]`; tests query by role and `aria-current`, never by class name.
5. **`useActiveCueIndex`** + tests: use a real `<video>` element, stub `currentTime` and dispatch events. Check that the active index updates on `seeked`/`timeupdate`, doesn't re-render while the index is unchanged, and that the rAF loop is cleaned up on `pause`, `ended` and unmount.
6. **`useAutoScroll`** + tests (fake timers, spied `scrollTo`): scrolls when the active index changes, pauses on `wheel`/`touchmove`, resumes after 4s, and resumes immediately via the button or a seek. Wire it into `TranscriptPanel` with the "Resume auto-scroll" button.
7. **`TranscriptWidget` integration:**
   - Install `@mux/mux-player-react`.
   - Add `TranscriptWidget.module.css`: grid layout, the container-query stacked layout, and the panel matching the player's height (see Styling). The `accentColor` prop feeds both the player and `--tw-accent`.
   - In tests, mock it as a forwardRef `<video>` so we can drive `currentTime` and events. Verify end to end: fetch → render → time change → highlight moves → click → `currentTime` is set.
8. **Demo page:**
   - Replace the template `App.tsx` with the widget, reading `VITE_MUX_PLAYBACK_ID` / `VITE_MUX_TRACK_ID` from `.env.local` (already gitignored via `*.local`). Add `.env.example`.
   - The page shows setup instructions when either variable is missing, and has a width dropdown (320–1120px) and an accent color picker for the stacking and `accentColor` checks below. `src/vite-env.d.ts` types the two variables.
   - Delete the template's `App.css`, images and `public/icons.svg`, and trim `index.css` to page-level styles.

## Verification
- `npm test` passes, and `npm run lint` and `npm run build` are clean after every step.
- Manual check with `npm run dev` on a real public asset that has a generated-captions track:
  - The highlight follows playback without visible lag.
  - Clicking a line seeks to it.
  - Scrolling with the wheel or trackpad stops auto-scroll, and it resumes after about 4s or via the button.
  - Seeking with the player's scrubber moves the highlight.
  - The page itself doesn't jump when the panel auto-scrolls.
  - Placing the widget in a narrow (<700px) parent makes it stack.
  - Passing `accentColor` restyles both the highlight and the player.
  - With reduced motion turned on in the OS, auto-scroll jumps instead of animating.

## Risks / notes
- **CORS:** confirmed. `stream.mux.com/{id}/text/...` responds with `access-control-allow-origin: *`.
- **Finding `trackId`:** the track ID comes from the Mux Asset API (`tracks[]` where `type: "text"`). The widget takes it as a prop and never calls the API itself, since that would need secret credentials.
- **Bundle size:** Mux Player (mostly hls.js) makes the bundle about 1.3 MB minified. If that matters for embedding, switch to `@mux/mux-player-react/lazy`.
