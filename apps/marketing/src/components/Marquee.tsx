import styles from './Marquee.module.css'

const items = [
  'On-Device AI Engine', 'WebAssembly Vision Core', 'Real-Time AR Overlay', 'Template Matching',
  'Multi-Scale Detection', 'HOG Descriptors', 'RANSAC Verification', 'Compass + GPS Fusion',
  'Voice Intelligence', 'Zero Cloud Architecture', 'IndexedDB Templates', 'Privacy by Design',
  'PWA · Offline Ready', '60fps Detection', 'Rust WASM Core', 'Spatial Mapping',
]

// Doubled so the 32s translateX(-50%) loop hands off seamlessly —
// the second half is an exact duplicate of the first, so the moment
// it wraps, it's showing the same content it started with.
const doubled = [...items, ...items]

export function Marquee() {
  return (
    <section id="marquee-section" className={styles.section}>
      <div className={styles.track}>
        <div className={styles.inner}>
          {doubled.map((txt, i) => (
            <div className={styles.item} key={i}>
              {txt}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
