import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useVttCues } from './useVttCues.ts'

const VTT_A = 'WEBVTT\n\n00:00.000 --> 00:01.000\nFrom A'
const VTT_B = 'WEBVTT\n\n00:00.000 --> 00:01.000\nFrom B'

/** A fetch response the test resolves by hand, to control ordering. */
function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('useVttCues', () => {
  test('is loading, then ready with the parsed cues', async () => {
    const response = deferredResponse()
    fetchMock.mockReturnValueOnce(response.promise)

    const { result } = renderHook(() => useVttCues('/a.vtt'))
    expect(result.current).toEqual({ status: 'loading', cues: [], error: null })
    expect(fetchMock).toHaveBeenCalledWith('/a.vtt', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    await act(async () => response.resolve(new Response(VTT_A)))
    expect(result.current.status).toBe('ready')
    expect(result.current.cues).toEqual([{ id: 'cue-0', start: 0, end: 1, text: 'From A' }])
  })

  test('reports an HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Not found', { status: 404 }))

    const { result } = renderHook(() => useVttCues('/missing.vtt'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toMatch(/HTTP 404/)
    expect(result.current.cues).toEqual([])
  })

  test('reports a network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const { result } = renderHook(() => useVttCues('/a.vtt'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('Failed to fetch')
  })

  test('aborts the request and loads the new URL when the URL changes', async () => {
    const first = deferredResponse()
    fetchMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(new Response(VTT_B))

    const { result, rerender } = renderHook(({ url }) => useVttCues(url), {
      initialProps: { url: '/a.vtt' },
    })
    const firstSignal = fetchMock.mock.calls[0][1]?.signal
    expect(firstSignal?.aborted).toBe(false)

    rerender({ url: '/b.vtt' })
    expect(firstSignal?.aborted).toBe(true)
    expect(result.current.status).toBe('loading')
    expect(fetchMock).toHaveBeenLastCalledWith('/b.vtt', expect.anything())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.cues[0].text).toBe('From B')
  })

  test('shows loading again after switching away from a loaded URL', async () => {
    const second = deferredResponse()
    fetchMock.mockResolvedValueOnce(new Response(VTT_A)).mockReturnValueOnce(second.promise)

    const { result, rerender } = renderHook(({ url }) => useVttCues(url), {
      initialProps: { url: '/a.vtt' },
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ url: '/b.vtt' })
    expect(result.current).toEqual({ status: 'loading', cues: [], error: null })
  })

  test('ignores a late response from a stale URL', async () => {
    // Neither mock response honours the abort signal, as if it had already
    // arrived, so the hook itself must discard the stale one.
    const first = deferredResponse()
    const second = deferredResponse()
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result, rerender } = renderHook(({ url }) => useVttCues(url), {
      initialProps: { url: '/a.vtt' },
    })
    rerender({ url: '/b.vtt' })

    await act(async () => second.resolve(new Response(VTT_B)))
    await act(async () => first.resolve(new Response(VTT_A)))

    expect(result.current.status).toBe('ready')
    expect(result.current.cues[0].text).toBe('From B')
  })

  test('aborts the request on unmount', () => {
    fetchMock.mockReturnValueOnce(deferredResponse().promise)

    const { unmount } = renderHook(() => useVttCues('/a.vtt'))
    const signal = fetchMock.mock.calls[0][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})
