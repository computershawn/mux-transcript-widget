import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { VideoPicker } from './VideoPicker.tsx'
import type { PickerVideo } from './VideoPicker.tsx'

const videos: PickerVideo[] = [
  { id: 'a', title: 'First video', thumbnailUrl: 'https://example.com/a.webp' },
  { id: 'b', title: 'Second video', thumbnailUrl: 'https://example.com/b.webp' },
  { id: 'c', title: 'Third video', thumbnailUrl: 'https://example.com/c.webp' },
]

function renderPicker(selectedId: string | undefined) {
  const onSelect = vi.fn()
  render(<VideoPicker videos={videos} selectedId={selectedId} onSelect={onSelect} />)
  return { onSelect }
}

describe('VideoPicker', () => {
  test('renders a button per video, labelled with its title', () => {
    renderPicker('a')
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      'First video',
      'Second video',
      'Third video',
    ])
  })

  test('marks only the selected video as pressed', () => {
    renderPicker('b')
    expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName('Second video')
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(2)
  })

  test('marks nothing as pressed when no video is selected', () => {
    renderPicker(undefined)
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument()
  })

  test('clicking a video calls onSelect with its id', async () => {
    const { onSelect } = renderPicker('a')
    await userEvent.click(screen.getByRole('button', { name: 'Third video' }))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('c')
  })
})
