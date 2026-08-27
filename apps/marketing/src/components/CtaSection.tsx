import styles from './CtaSection.module.css'
import sectionStyles from './Section.module.css'
import { useReveal } from '../hooks/useReveal'
import { useOffscreenPause } from '../hooks/useOffscreenPause'
import { appLinks } from '../lib/app-links'

export function CtaSection() {
  const ref = useReveal()
  useOffscreenPause(ref)

  return (
    <section id="cta-section" className={styles.section} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.glow} />
      <div className={sectionStyles.sectionInner} style={{ textAlign: 'center' }}>
        <span className={`${sectionStyles.eyebrow} reveal`} style={{ display: 'block', textAlign: 'center', margin: '0 auto 20px' }}>
          Start Today
        </span>
        <h2 className={`${sectionStyles.h2} reveal`}>
          Ready to see <span className="accent">differently?</span>
        </h2>
        <p className={`${sectionStyles.body} reveal`} style={{ margin: '0 auto 56px', textAlign: 'center' }}>
          Free to use. No credit card required. Create your account, grant camera access, and
          experience the future of augmented reality — right now.
        </p>
        <div className={`${styles.btnWrap} reveal`}>
          <a
            href={appLinks.signup}
            className={styles.searchBar}
            aria-label="Try Spatial AI Explorer — point your camera at anything"
          >
            <span className={styles.searchIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            <span className={styles.searchPlaceholder}>
              Point your camera at anything
              <span className={styles.searchCaret} aria-hidden="true" />
            </span>
            <span className={styles.searchSubmit} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </a>

          <div className={styles.chipRow}>
            {['Identify any object', 'Translate live text', 'Read documents aloud'].map((chip) => (
              <a key={chip} href={appLinks.signup} className={styles.chip}>
                {chip}
              </a>
            ))}
          </div>
        </div>
        <p className={styles.fine}>
          Free account · No credit card · Works on Chrome, Edge, and Safari 16+ · Requires camera
          permission
        </p>
      </div>
    </section>
  )
}
