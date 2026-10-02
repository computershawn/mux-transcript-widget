export interface Video {
  /** Public playback ID. */
  playbackId: string
  /** ID of the asset's text track to show as the transcript. */
  trackId: string
  title: string
  /** Attribution shown on the demo page, as the video's license asks. */
  credit: string
}

/** The demo's videos; the first one loads on mount. Playback is public, so
 * these IDs aren't secrets. */
export const VIDEOS: Video[] = [
  {
    playbackId: 'oIsnh700l9JjYYOAyUixeVRJ01YU00u8qXSgI6NviczBwM',
    trackId: 'dOr7Jw9kedDuATRr8OIF8rnhCgics3jxwgjag5IHTI102U02T9Vz9D2g',
    title: 'Tears of Steel',
    credit: '(CC) Blender Foundation | mango.blender.org, CC BY 3.0',
  },
  {
    playbackId: '4izgBn01skqWuYJ98NNDpWYU00CqRHWULd01Qmy4xVUtgQ',
    trackId: 'sGeSaVUSoTRmrztgoQljjOS324cM5zXF00bgxjVux502Fuy01QBpFJ702A',
    title: 'Elephants Dream',
    credit: '(c) 2006 Blender Foundation / Netherlands Media Art Institute | elephantsdream.org, CC BY 2.5',
  },
  {
    playbackId: 'OdZc9ma6Wjyre6dEmOoU9DMHi8Kmaq9gdiuF400mq02kE',
    trackId: 'itYj9OB6TLJWrfU2U01B02XdlXGlDp801SkcL3ZzhosmoDGexJAmpuWHQ',
    title: 'SIGGRAPH Daily 2015',
    credit: "NASA's Scientific Visualization Studio, public domain",
  },
]
