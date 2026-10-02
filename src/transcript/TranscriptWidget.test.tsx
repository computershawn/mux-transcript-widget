import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { TranscriptWidget } from './TranscriptWidget.tsx'

// Mux Player can't run in jsdom, so it's replaced by a <video> whose
// `currentTime` the test controls. `playerProps` records what it was given.
const { playerProps } = vi.hoisted(() => ({ playerProps: vi.fn() }))
vi.mock('@mux/mux-player-react', () => ({
  default: forwardRef<HTMLVideoElement, Record<string, unknown>>(function MockMuxPlayer(props, ref) {
    playerProps(props)
    return <video ref={ref} data-testid="player" />
  }),
}))

const VTT = `WEBVTT

00:00.000 --> 00:02.000
First line

00:02.000 --> 00:05.000
Second line

00:05.000 --> 00:09.000
Third line
`

let fetchMock: ReturnType<typeof vi.fn>

// jsdom doesn't implement Element#scrollTo, which auto-scroll calls.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn()
})
afterAll(() => {
  delete (Element.prototype as Partial<Element>).scrollTo
})

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(VTT))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  playerProps.mockClear()
})

/** Gives the mock player a settable `currentTime`, and returns a way to move
 * it and fire `seeked` as a real player would. */
function controlPlayer() {
  const video = screen.getByTestId('player') as HTMLVideoElement
  let time = 0
  Object.defineProperty(video, 'currentTime', {
    get: () => time,
    set: (value: number) => {
      time = value
    },
    configurable: true,
  })
  return {
    video,
    get time() {
      return time
    },
    seekTo(value: number) {
      time = value
      act(() => {
        video.dispatchEvent(new Event('seeked'))
      })
    },
  }
}

function lastPlayerProps() {
  return playerProps.mock.lastCall?.[0] as Record<string, unknown>
}

describe('TranscriptWidget', () => {
  test("fetches the track's transcript from Mux and renders it", async () => {
    render(<TranscriptWidget playbackId="play123" trackId="track456" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading transcript')

    expect(await screen.findAllByRole('button')).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://stream.mux.com/play123/text/track456.vtt',
      expect.anything(),
    )
    expect(lastPlayerProps()).toMatchObject({ playbackId: 'play123' })
  })

  test('loads the new transcript when the video changes', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      new Response(url.includes('track2') ? 'WEBVTT\n\n00:00.000 --> 00:03.000\nOther video\n' : VTT),
    )
    const { rerender } = render(<TranscriptWidget playbackId="play1" trackId="track1" />)
    await screen.findByRole('button', { name: /First line/ })

    rerender(<TranscriptWidget playbackId="play2" trackId="track2" />)
    expect(await screen.findByRole('button', { name: /Other video/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /First line/ })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://stream.mux.com/play2/text/track2.vtt',
      expect.anything(),
    )
    expect(lastPlayerProps()).toMatchObject({ playbackId: 'play2' })
  })

  test('fetches from vttUrl when given', async () => {
    render(<TranscriptWidget playbackId="p" trackId="t" vttUrl="/captions.vtt" />)
    await screen.findByRole('button', { name: /First line/ })
    expect(fetchMock).toHaveBeenCalledWith('/captions.vtt', expect.anything())
  })

  test('shows an error when the transcript fails to load', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))
    render(<TranscriptWidget playbackId="p" trackId="t" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 404')
  })

  test('highlights the cue at the player time as it changes', async () => {
    render(<TranscriptWidget playbackId="p" trackId="t" />)
    await screen.findByRole('button', { name: /First line/ })
    const player = controlPlayer()

    player.seekTo(3)
    expect(screen.getByRole('button', { current: true })).toHaveTextContent('Second line')
    player.seekTo(6)
    expect(screen.getByRole('button', { current: true })).toHaveTextContent('Third line')
  })

  test('clicking a line seeks the player just past its start', async () => {
    render(<TranscriptWidget playbackId="p" trackId="t" />)
    await screen.findByRole('button', { name: /First line/ })
    const player = controlPlayer()

    await userEvent.click(screen.getByRole('button', { name: /Third line/ }))
    expect(player.time).toBeCloseTo(5.001)
    // The player then reports the seek, and the highlight follows.
    player.seekTo(player.time)
    expect(screen.getByRole('button', { current: true })).toHaveTextContent('Third line')
  })

  test('clicking a line clears the poster, so the new frame shows before playback starts', async () => {
    render(<TranscriptWidget playbackId="p" trackId="t" poster="https://example.com/poster.jpg" />)
    await screen.findByRole('button', { name: /First line/ })
    expect(lastPlayerProps()).toMatchObject({ poster: 'https://example.com/poster.jpg' })

    controlPlayer()
    await userEvent.click(screen.getByRole('button', { name: /Second line/ }))
    expect(lastPlayerProps()).toMatchObject({ poster: '' })
  })

  test('accentColor colors both the player and the transcript', async () => {
    const { container } = render(
      <TranscriptWidget playbackId="p" trackId="t" accentColor="#00ff00" style={{ maxWidth: 900 }} />,
    )
    expect(lastPlayerProps()).toMatchObject({ accentColor: '#00ff00' })
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--tw-accent')).toBe('#00ff00')
    expect(root.style.maxWidth).toBe('900px')
    await waitFor(() => expect(screen.getAllByRole('button')).toHaveLength(3))
  })

  test('passes other props to the player, and className to the root', async () => {
    const metadata = { video_title: 'Demo' }
    const { container } = render(
      <TranscriptWidget playbackId="p" trackId="t" metadata={metadata} className="host" />,
    )
    const props = lastPlayerProps()
    expect(props).toMatchObject({ metadata })
    expect(props).not.toHaveProperty('trackId')
    expect(props.className).not.toContain('host')
    expect(container.firstElementChild).toHaveClass('host')
    await waitFor(() => expect(screen.getAllByRole('button')).toHaveLength(3))
  })
})
