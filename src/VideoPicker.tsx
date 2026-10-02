import styles from './VideoPicker.module.css'

export interface PickerVideo {
  id: string
  title: string
  thumbnailUrl: string
}

interface VideoPickerProps {
  videos: PickerVideo[]
  selectedId: string | undefined
  onSelect: (id: string) => void
}

/** A grid of video thumbnails; clicking one selects it. The selected video's
 * button has `aria-pressed`, which also drives its highlight. */
export function VideoPicker({ videos, selectedId, onSelect }: VideoPickerProps) {
  return (
    <ul className={styles.picker} aria-label="Videos">
      {videos.map((video) => (
        <li key={video.id}>
          <button
            type="button"
            className={styles.item}
            aria-pressed={video.id === selectedId}
            onClick={() => onSelect(video.id)}
          >
            <img className={styles.thumbnail} src={video.thumbnailUrl} alt="" loading="lazy" />
            <span className={styles.title}>{video.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
