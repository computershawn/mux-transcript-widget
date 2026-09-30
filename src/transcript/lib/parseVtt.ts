import type { Cue } from '../types.ts'

const TIMESTAMP = String.raw`(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})`
const TIMING_LINE = new RegExp(`^${TIMESTAMP}[ \\t]+-->[ \\t]+${TIMESTAMP}`)

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lrm: '‎',
  rlm: '‏',
}

/** Converts captured timestamp parts (hours optional) to seconds. */
function toSeconds(h: string | undefined, m: string, s: string, ms: string): number {
  return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
}

/** Decodes named and numeric HTML entities; unknown ones are left as-is. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match
  })
}

/** Flattens cue text lines into one plain-text string without tags. */
function cleanText(lines: string[]): string {
  // Collapse whitespace before decoding so entities like &nbsp; survive.
  const joined = lines.join(' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return decodeEntities(joined)
}

/**
 * Parses a WebVTT document into cues sorted by start time, flattened to
 * plain text for transcript display. Malformed blocks are skipped.
 */
export function parseVtt(input: string): Cue[] {
  const normalized = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const blocks = normalized.split(/\n(?:[ \t]*\n)+/)
  const cues: Cue[] = []

  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n').filter((line, i) => i > 0 || line.trim() !== '')
    if (lines.length === 0) return
    if (blockIndex === 0 && /^WEBVTT(?:[ \t]|$)/.test(lines[0])) return
    if (/^(?:NOTE|STYLE|REGION)(?:[ \t]|$)/.test(lines[0])) return

    const timingIndex = lines[0].includes('-->') ? 0 : 1
    const match = lines[timingIndex]?.match(TIMING_LINE)
    if (!match) return

    const start = toSeconds(match[1], match[2], match[3], match[4])
    const end = toSeconds(match[5], match[6], match[7], match[8])
    const text = cleanText(lines.slice(timingIndex + 1))
    if (end < start || text === '') return

    cues.push({
      id: timingIndex === 1 ? lines[0].trim() : `cue-${cues.length}`,
      start,
      end,
      text,
    })
  })

  return cues.sort((a, b) => a.start - b.start)
}
