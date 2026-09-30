import { describe, expect, test } from 'vitest'
import { parseVtt } from './parseVtt.ts'

describe('parseVtt', () => {
  test('parses mm:ss.ttt and hh:mm:ss.ttt timestamps', () => {
    const cues = parseVtt(
      ['WEBVTT', '', '00:01.500 --> 00:04.250', 'Hello', '', '01:02:03.004 --> 01:02:05.000', 'Later'].join('\n'),
    )
    expect(cues).toEqual([
      { id: 'cue-0', start: 1.5, end: 4.25, text: 'Hello' },
      { id: 'cue-1', start: 3723.004, end: 3725, text: 'Later' },
    ])
  })

  test('skips a BOM and header text/metadata', () => {
    const cues = parseVtt('﻿WEBVTT - Title\nKind: captions\n\n00:00.000 --> 00:01.000\nHi')
    expect(cues).toHaveLength(1)
    expect(cues[0].text).toBe('Hi')
  })

  test('uses cue identifiers as ids', () => {
    const cues = parseVtt('WEBVTT\n\nintro-1\n00:00.000 --> 00:01.000\nHi')
    expect(cues[0]).toMatchObject({ id: 'intro-1', text: 'Hi' })
  })

  test('ignores cue settings after the timestamps', () => {
    const cues = parseVtt('WEBVTT\n\n00:00.000 --> 00:02.000 align:start position:10% line:0\nHi')
    expect(cues[0]).toMatchObject({ start: 0, end: 2, text: 'Hi' })
  })

  test('joins multi-line cue text with spaces', () => {
    const cues = parseVtt('WEBVTT\n\n00:00.000 --> 00:02.000\nfirst line\nsecond line')
    expect(cues[0].text).toBe('first line second line')
  })

  test('skips NOTE, STYLE and REGION blocks', () => {
    const cues = parseVtt(
      [
        'WEBVTT',
        '',
        'NOTE this is a comment',
        'spanning lines',
        '',
        'STYLE',
        '::cue { color: red }',
        '',
        'REGION',
        'id:fred width:40%',
        '',
        '00:00.000 --> 00:01.000',
        'Only cue',
      ].join('\n'),
    )
    expect(cues.map((c) => c.text)).toEqual(['Only cue'])
  })

  test('strips tags and decodes entities', () => {
    const cues = parseVtt(
      'WEBVTT\n\n00:00.000 --> 00:02.000\n<v Roger Bingham><i>Tom</i> &amp; Jerry &lt;3 &#39;hi&#x27; <00:00:01.000>ok&nbsp;now',
    )
    expect(cues[0].text).toBe("Tom & Jerry <3 'hi' ok now")
  })

  test('handles CRLF and CR line endings', () => {
    expect(parseVtt('WEBVTT\r\n\r\n00:00.000 --> 00:01.000\r\nA\r\n\r\n00:01.000 --> 00:02.000\r\nB')).toHaveLength(2)
    expect(parseVtt('WEBVTT\r\r00:00.000 --> 00:01.000\rA')).toHaveLength(1)
  })

  test('skips malformed blocks without throwing', () => {
    const cues = parseVtt(
      [
        'WEBVTT',
        '',
        'not a cue at all',
        '',
        '00:00 --> 00:01',
        'bad timestamp',
        '',
        '00:05.000 --> 00:04.000',
        'ends before it starts',
        '',
        '00:06.000 --> 00:07.000',
        '',
        '00:08.000 --> 00:09.000',
        'good',
      ].join('\n'),
    )
    expect(cues.map((c) => c.text)).toEqual(['good'])
  })

  test('sorts cues by start time', () => {
    const cues = parseVtt('WEBVTT\n\n00:05.000 --> 00:06.000\nB\n\n00:01.000 --> 00:02.000\nA')
    expect(cues.map((c) => c.text)).toEqual(['A', 'B'])
  })

  test('returns [] for empty input', () => {
    expect(parseVtt('')).toEqual([])
    expect(parseVtt('WEBVTT')).toEqual([])
  })
})
