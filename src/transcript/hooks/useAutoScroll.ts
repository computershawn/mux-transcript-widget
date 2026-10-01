import { useCallback, useEffect, useRef, useState } from 'react'

/** How long after the user's last scroll auto-scroll resumes by itself. */
export const RESUME_DELAY_MS = 4000

/** Keys that scroll the container when focus is on one of its lines. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

export interface ResumeOptions {
  /** Scroll to the active line now (default true). Pass false when about to
   * seek, since the active line is about to change and will scroll then. */
  scroll?: boolean
}

export interface AutoScroll {
  /** True while the user is scrolling the container themselves. */
  paused: boolean
  /** Resumes auto-scroll now. No-op when not paused. */
  resume: (options?: ResumeOptions) => void
  /** Stops the pause from timing out, e.g. while the resume button has focus. */
  hold: () => void
  /** Undoes `hold`; the pause times out `RESUME_DELAY_MS` from now. */
  release: () => void
}

/**
 * Keeps the active line (the element in `container` with
 * `aria-current="true"`) about a third of the way down `container`, scrolling
 * when `activeIndex` changes.
 *
 * Pauses while the user scrolls the container, detected from user-intent
 * events (wheel, touch drags, a press on the container itself such as its
 * scrollbar, scroll keys) rather than `scroll`, which our own scrolling fires
 * too. Resumes `RESUME_DELAY_MS` after the last of them, or on `resume()`.
 * All returned functions are stable while `container` is unchanged.
 */
export function useAutoScroll(container: HTMLElement | null, activeIndex: number): AutoScroll {
  const [paused, setPaused] = useState(false)
  // Mirrors `paused` for event handlers and effects that shouldn't re-run on it.
  const pausedRef = useRef(false)
  const heldRef = useRef(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const resume = useCallback(
    ({ scroll = true }: ResumeOptions = {}) => {
      clearTimeout(resumeTimer.current)
      if (!pausedRef.current) return
      pausedRef.current = false
      setPaused(false)
      if (scroll && container) scrollToActive(container)
    },
    [container],
  )

  /** (Re)starts the countdown to resuming, unless held. */
  const restartResumeTimer = useCallback(() => {
    clearTimeout(resumeTimer.current)
    if (!heldRef.current) resumeTimer.current = setTimeout(() => resume(), RESUME_DELAY_MS)
  }, [resume])

  const hold = useCallback(() => {
    heldRef.current = true
    clearTimeout(resumeTimer.current)
  }, [])

  const release = useCallback(() => {
    heldRef.current = false
    if (pausedRef.current) restartResumeTimer()
  }, [restartResumeTimer])

  useEffect(() => {
    if (!container) return

    const pause = () => {
      pausedRef.current = true
      setPaused(true)
      restartResumeTimer()
    }
    // Presses on a line bubble up with the line as target; only a press on
    // the container itself (its scrollbar or padding) is a scroll.
    const onPointerDown = (event: PointerEvent) => {
      if (event.target === container) pause()
    }
    // Space scrolls only when the container itself has focus; on a line it
    // clicks the line.
    const onKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key) || (event.key === ' ' && event.target === container)) pause()
    }

    // `touchmove`, not `touchstart`: a tap on a line would otherwise pause.
    container.addEventListener('wheel', pause, { passive: true })
    container.addEventListener('touchmove', pause, { passive: true })
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('keydown', onKeyDown)

    return () => {
      clearTimeout(resumeTimer.current)
      container.removeEventListener('wheel', pause)
      container.removeEventListener('touchmove', pause)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('keydown', onKeyDown)
    }
  }, [container, restartResumeTimer])

  // Only on a change of line: resuming scrolls by itself (see `resume`), so
  // a resume before a seek doesn't first scroll back to the old line.
  useEffect(() => {
    if (container && activeIndex >= 0 && !pausedRef.current) scrollToActive(container)
  }, [container, activeIndex])

  return { paused, resume, hold, release }
}

/** Scrolls `container` to put its active line a third of the way down. */
function scrollToActive(container: HTMLElement) {
  const line = container.querySelector('[aria-current="true"]')
  if (!line) return

  // The line's offset within the scrolled content. `scrollTo` rather than
  // `scrollIntoView`, which would also scroll the page.
  const lineTop =
    line.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  container.scrollTo({
    top: Math.max(0, lineTop - container.clientHeight / 3),
    behavior: prefersMotion() ? 'smooth' : 'auto',
  })
}

function prefersMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches ?? false
}
