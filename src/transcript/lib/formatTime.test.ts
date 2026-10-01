import { expect, test } from 'vitest'
import { formatTime } from './formatTime.ts'

test('formats times under an hour as m:ss', () => {
  expect(formatTime(0)).toBe('0:00')
  expect(formatTime(5)).toBe('0:05')
  expect(formatTime(65)).toBe('1:05')
  expect(formatTime(3599)).toBe('59:59')
})

test('formats times from an hour as h:mm:ss', () => {
  expect(formatTime(3600)).toBe('1:00:00')
  expect(formatTime(3723)).toBe('1:02:03')
})

test('rounds fractional seconds down', () => {
  expect(formatTime(1.999)).toBe('0:01')
})

test('treats negative and non-finite values as zero', () => {
  expect(formatTime(-3)).toBe('0:00')
  expect(formatTime(Number.NaN)).toBe('0:00')
  expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00')
})
