/** URL of a Mux asset's WebVTT text track (public playback). */
export function vttUrl(playbackId: string, trackId: string): string {
  return `https://stream.mux.com/${encodeURIComponent(playbackId)}/text/${encodeURIComponent(trackId)}.vtt`
}

/** URL of a still image from a Mux asset (public playback). Without `time`,
 * Mux uses the middle of the video. */
export function thumbnailUrl(playbackId: string, { width, time }: { width: number; time?: number }): string {
  const params = new URLSearchParams({ width: String(width) })
  if (time !== undefined) params.set('time', String(time))
  return `https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.webp?${params}`
}
