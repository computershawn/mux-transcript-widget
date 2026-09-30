import { expect, test } from 'vitest'
import { vttUrl } from './muxUrls.ts'

test('vttUrl builds the stream.mux.com text track URL', () => {
  expect(vttUrl('abc123', 'track456')).toBe('https://stream.mux.com/abc123/text/track456.vtt')
})

test('vttUrl encodes its path segments', () => {
  expect(vttUrl('a/b', 'c d')).toBe('https://stream.mux.com/a%2Fb/text/c%20d.vtt')
})
