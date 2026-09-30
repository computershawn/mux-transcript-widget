/** URL of a Mux asset's WebVTT text track (public playback). */
export function vttUrl(playbackId: string, trackId: string): string {
  return `https://stream.mux.com/${encodeURIComponent(playbackId)}/text/${encodeURIComponent(trackId)}.vtt`
}
