import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

// Guards the test setup itself: jsdom, React Testing Library and jest-dom matchers.
test('renders into jsdom with jest-dom matchers available', () => {
  render(<button aria-current="true">Hello</button>)
  expect(screen.getByRole('button', { current: true })).toHaveTextContent('Hello')
})
