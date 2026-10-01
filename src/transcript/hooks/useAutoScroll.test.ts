import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { RESUME_DELAY_MS, useAutoScroll } from './useAutoScroll.ts'

let container: HTMLDivElement
let lines: HTMLParagraphElement[]
let scrollTo: ReturnType<typeof vi.fn>

/** Marks line `index` (or none, for -1) as the active one. */
function setActive(index: number) {
  lines.forEach((line, i) => {
    if (i === index) line.setAttribute('aria-current', 'true')
    else line.removeAttribute('aria-current')
  })
}

/** Renders the hook with line `activeIndex` marked active. */
function renderAutoScroll(activeIndex: number) {
  setActive(activeIndex)
  const hook = renderHook(({ index }) => useAutoScroll(container, index), {
    initialProps: { index: activeIndex },
  })
  return {
    ...hook,
    setIndex(index: number) {
      setActive(index)
      hook.rerender({ index })
    },
  }
}

function dispatch(target: EventTarget, event: Event) {
  act(() => {
    target.dispatchEvent(event)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  container = document.createElement('div')
  lines = [0, 1, 2].map(() => container.appendChild(document.createElement('p')))
  document.body.append(container)
  // jsdom doesn't implement Element#scrollTo.
  scrollTo = vi.fn()
  container.scrollTo = scrollTo as HTMLElement['scrollTo']
})

afterEach(() => {
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useAutoScroll', () => {
  test('does not scroll while no line is active', () => {
    renderAutoScroll(-1)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  test('scrolls to the active line on mount and when the index changes', () => {
    const { setIndex } = renderAutoScroll(0)
    expect(scrollTo).toHaveBeenCalledTimes(1)
    setIndex(1)
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })

  test('does not scroll again while the index is unchanged', () => {
    const { rerender } = renderAutoScroll(1)
    rerender({ index: 1 })
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  test('puts the active line a third of the way down the container', () => {
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 300, 300))
    vi.spyOn(lines[2], 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 400, 300, 30))
    Object.defineProperty(container, 'clientHeight', { value: 300 })
    container.scrollTop = 50
    renderAutoScroll(2)
    // Line is 300px below the container's top plus 50px already scrolled,
    // less a third of the 300px height.
    expect(scrollTo).toHaveBeenCalledWith({ top: 250, behavior: 'auto' })
  })

  test('never scrolls above the top', () => {
    Object.defineProperty(container, 'clientHeight', { value: 300 })
    renderAutoScroll(0)
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  test('scrolls smoothly only when reduced motion is not requested', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query.includes('no-preference') }))
    vi.stubGlobal('matchMedia', matchMedia)
    const { setIndex } = renderAutoScroll(0)
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }))

    matchMedia.mockReturnValue({ matches: false })
    setIndex(1)
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }))
  })

  test.each([
    ['wheel', () => new WheelEvent('wheel', { bubbles: true })],
    ['touchmove', () => new Event('touchmove', { bubbles: true })],
    ['a scroll key', () => new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true })],
  ])('pauses on %s and stops scrolling', (_, makeEvent) => {
    const { result, setIndex } = renderAutoScroll(0)
    dispatch(lines[0], makeEvent())
    expect(result.current.paused).toBe(true)
    setIndex(1)
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  test('a tap (touchstart without touchmove) does not pause', () => {
    const { result } = renderAutoScroll(0)
    dispatch(lines[0], new Event('touchstart', { bubbles: true }))
    expect(result.current.paused).toBe(false)
  })

  test('pauses on a press on the container itself, not on a line', () => {
    const { result } = renderAutoScroll(0)
    dispatch(lines[0], new Event('pointerdown', { bubbles: true }))
    expect(result.current.paused).toBe(false)
    dispatch(container, new Event('pointerdown', { bubbles: true }))
    expect(result.current.paused).toBe(true)
  })

  test('Space pauses only when the container itself has focus', () => {
    const { result } = renderAutoScroll(0)
    dispatch(lines[0], new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(result.current.paused).toBe(false)
    dispatch(container, new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(result.current.paused).toBe(true)
  })

  test('ignores keys that do not scroll', () => {
    const { result } = renderAutoScroll(0)
    dispatch(lines[0], new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(result.current.paused).toBe(false)
  })

  test('resumes after the delay and scrolls to the current line', () => {
    const { result, setIndex } = renderAutoScroll(0)
    dispatch(container, new WheelEvent('wheel'))
    setIndex(2)

    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS - 1))
    expect(result.current.paused).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.paused).toBe(false)
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })

  test('each scroll restarts the delay', () => {
    const { result } = renderAutoScroll(0)
    dispatch(container, new WheelEvent('wheel'))
    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS - 1000))
    dispatch(container, new WheelEvent('wheel'))
    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS - 1))
    expect(result.current.paused).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.paused).toBe(false)
  })

  test('resume() resumes immediately and scrolls to the current line', () => {
    const { result } = renderAutoScroll(0)
    dispatch(container, new WheelEvent('wheel'))
    act(() => result.current.resume())
    expect(result.current.paused).toBe(false)
    expect(scrollTo).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  test('resume({ scroll: false }) resumes without scrolling, then follows the next line', () => {
    const { result, setIndex } = renderAutoScroll(0)
    dispatch(container, new WheelEvent('wheel'))
    act(() => result.current.resume({ scroll: false }))
    expect(result.current.paused).toBe(false)
    expect(scrollTo).toHaveBeenCalledTimes(1)
    setIndex(2)
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })

  test('resume() does not scroll when not paused', () => {
    const { result } = renderAutoScroll(0)
    act(() => result.current.resume())
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  test('while held, the pause does not time out, even if the user scrolls again', () => {
    const { result } = renderAutoScroll(0)
    dispatch(container, new WheelEvent('wheel'))
    act(() => result.current.hold())
    dispatch(container, new WheelEvent('wheel'))
    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS * 2))
    expect(result.current.paused).toBe(true)
  })

  test('release restarts the delay', () => {
    const { result } = renderAutoScroll(0)
    dispatch(container, new WheelEvent('wheel'))
    act(() => result.current.hold())
    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS))
    act(() => result.current.release())
    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS - 1))
    expect(result.current.paused).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.paused).toBe(false)
  })

  test('release does nothing when not paused', () => {
    const { result } = renderAutoScroll(0)
    act(() => {
      result.current.hold()
      result.current.release()
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  test('the returned functions are stable across renders', () => {
    const { result, setIndex } = renderAutoScroll(0)
    const { resume, hold, release } = result.current
    setIndex(1)
    expect(result.current.resume).toBe(resume)
    expect(result.current.hold).toBe(hold)
    expect(result.current.release).toBe(release)
  })

  test('clears the resume timer on unmount', () => {
    const { unmount } = renderAutoScroll(0)
    dispatch(container, new WheelEvent('wheel'))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
