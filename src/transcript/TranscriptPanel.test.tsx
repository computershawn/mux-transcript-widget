import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { RESUME_DELAY_MS } from './hooks/useAutoScroll.ts'
import { TranscriptPanel } from './TranscriptPanel.tsx'
import type { Cue } from './types.ts'

const cues: Cue[] = [
  { id: 'a', start: 0, end: 2, text: 'First line' },
  { id: 'b', start: 2.5, end: 5, text: 'Second line' },
  { id: 'c', start: 65, end: 70, text: 'Third line' },
]

function renderPanel(props: Partial<Parameters<typeof TranscriptPanel>[0]> = {}) {
  const onSeek = vi.fn()
  render(<TranscriptPanel status="ready" cues={cues} activeIndex={-1} onSeek={onSeek} {...props} />)
  return { onSeek }
}

// jsdom doesn't implement Element#scrollTo, which auto-scroll calls.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn()
})
afterAll(() => {
  delete (Element.prototype as Partial<Element>).scrollTo
})
afterEach(() => {
  vi.mocked(Element.prototype.scrollTo).mockClear()
  vi.useRealTimers()
})

describe('TranscriptPanel', () => {
  test('renders a line per cue with its start time', () => {
    renderPanel()
    const lines = screen.getAllByRole('button')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toHaveTextContent('0:00First line')
    expect(lines[2]).toHaveTextContent('1:05Third line')
  })

  test('marks only the active line with aria-current', () => {
    renderPanel({ activeIndex: 1 })
    expect(screen.getByRole('button', { current: true })).toHaveTextContent('Second line')
    expect(screen.getAllByRole('button', { current: false })).toHaveLength(2)
  })

  test('marks no line when activeIndex is -1', () => {
    renderPanel({ activeIndex: -1 })
    expect(screen.queryByRole('button', { current: true })).not.toBeInTheDocument()
  })

  test('clicking a line calls onSeek with its start time', async () => {
    const { onSeek } = renderPanel()
    await userEvent.click(screen.getByRole('button', { name: /Second line/ }))
    expect(onSeek).toHaveBeenCalledExactlyOnceWith(2.5)
  })

  test('lines are keyboard-activatable', async () => {
    const { onSeek } = renderPanel()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onSeek).toHaveBeenCalledExactlyOnceWith(0)
  })

  test('shows a loading state', () => {
    renderPanel({ status: 'loading', cues: [] })
    expect(screen.getByRole('status')).toHaveTextContent('Loading transcript')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('shows an error state with the error message', () => {
    renderPanel({ status: 'error', cues: [], error: new Error('HTTP 404') })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load the transcript.")
    expect(alert).toHaveTextContent('HTTP 404')
  })

  test('shows an empty state when there are no cues', () => {
    renderPanel({ cues: [] })
    expect(screen.getByText('No transcript available.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('is labelled as the transcript region', () => {
    renderPanel()
    expect(screen.getByRole('region', { name: 'Transcript' })).toBeInTheDocument()
  })

  test('scrolling the panel shows a button that resumes auto-scroll', async () => {
    renderPanel({ activeIndex: 0 })
    expect(screen.queryByRole('button', { name: 'Resume auto-scroll' })).not.toBeInTheDocument()

    fireEvent.wheel(screen.getByRole('list'))
    await userEvent.click(screen.getByRole('button', { name: 'Resume auto-scroll' }))
    expect(screen.queryByRole('button', { name: 'Resume auto-scroll' })).not.toBeInTheDocument()
  })

  test('clicking a line while paused seeks and resumes, without scrolling back to the old line', async () => {
    const { onSeek } = renderPanel({ activeIndex: 0 })
    fireEvent.wheel(screen.getByRole('list'))
    vi.mocked(Element.prototype.scrollTo).mockClear()

    await userEvent.click(screen.getByRole('button', { name: /Third line/ }))
    expect(onSeek).toHaveBeenCalledExactlyOnceWith(65)
    expect(screen.queryByRole('button', { name: 'Resume auto-scroll' })).not.toBeInTheDocument()
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled()
  })

  test('the resume button moves focus to the active line', async () => {
    renderPanel({ activeIndex: 1 })
    fireEvent.wheel(screen.getByRole('list'))
    await userEvent.click(screen.getByRole('button', { name: 'Resume auto-scroll' }))
    expect(screen.getByRole('button', { current: true })).toHaveFocus()
  })

  test('with no active line, the resume button moves focus to the scroll area', async () => {
    renderPanel({ activeIndex: -1 })
    const list = screen.getByRole('list')
    fireEvent.wheel(list)
    await userEvent.click(screen.getByRole('button', { name: 'Resume auto-scroll' }))
    expect(list.parentElement).toHaveFocus()
  })

  test('stays paused while the resume button has focus', () => {
    vi.useFakeTimers()
    renderPanel({ activeIndex: 0 })
    fireEvent.wheel(screen.getByRole('list'))
    const resumeButton = screen.getByRole('button', { name: 'Resume auto-scroll' })

    act(() => resumeButton.focus())
    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS * 2))
    expect(resumeButton).toBeInTheDocument()

    act(() => resumeButton.blur())
    act(() => vi.advanceTimersByTime(RESUME_DELAY_MS))
    expect(resumeButton).not.toBeInTheDocument()
  })
})
