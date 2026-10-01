/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MUX_PLAYBACK_ID?: string
  readonly VITE_MUX_TRACK_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
