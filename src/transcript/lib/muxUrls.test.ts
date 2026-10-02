import { expect, test } from 'vitest'
import { thumbnailUrl, vttUrl } from './muxUrls.ts'

test('vttUrl builds the stream.mux.com text track URL', () => {
  expect(vttUrl('abc123', 'track456')).toBe('https://stream.mux.com/abc123/text/track456.vtt')
})

test('vttUrl encodes its path segments', () => {
  expect(vttUrl('a/b', 'c d')).toBe('https://stream.mux.com/a%2Fb/text/c%20d.vtt')
})

test('thumbnailUrl builds the image.mux.com thumbnail URL at the given width', () => {
  expect(thumbnailUrl('abc123', { width: 480 })).toBe(
    'https://image.mux.com/abc123/thumbnail.webp?width=480',
  )
})

test('thumbnailUrl adds the time when given, and encodes the playback ID', () => {
  expect(thumbnailUrl('a/b', { width: 320, time: 12.5 })).toBe(
    'https://image.mux.com/a%2Fb/thumbnail.webp?width=320&time=12.5',
  )
})
