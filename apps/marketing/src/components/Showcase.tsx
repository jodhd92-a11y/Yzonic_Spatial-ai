import styles from './Showcase.module.css'
import sectionStyles from './Section.module.css'
import { useReveal } from '../hooks/useReveal'
import { useOffscreenPause } from '../hooks/useOffscreenPause'

export function Showcase() {
  const ref = useReveal()
  useOffscreenPause(ref)

  return (
    <section id="showcase-section" ref={ref as React.RefObject<HTMLElement>}>
      {/* Panel 1 — AR frame */}
      <div className={styles.panel}>
        <div className={`${styles.text} reveal`} data-reveal="left">
          <span className={sectionStyles.eyebrow}>Clinical Overlay</span>
          <h3>
            The case, annotated
            <br />
            in milliseconds.
          </h3>
          <p>
            Our detection engine processes every frame from your camera — reading
            workflow-specific findings, measuring against a calibrated scale, and
            overlaying case context without any perceptible delay.
          </p>
          <a href="#gallery-section" className={styles.learnLink}>
            Explore the technology
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        <div className={`${styles.visual} reveal`} data-reveal="right">
          <div className={styles.arFrame}>
            <div className={styles.scanTint} />
            <div className={styles.scanGrid} />
            <div className={styles.arCrosshair} />
            <div className={`${styles.arCorner} ${styles.tl}`} />
            <div className={`${styles.arCorner} ${styles.tr}`} />
            <div className={`${styles.arCorner} ${styles.bl}`} />
            <div className={`${styles.arCorner} ${styles.br}`} />
            <div className={`${styles.arTag} ${styles.tag1}`}>conf: 0.94</div>
            <div className={`${styles.arTag} ${styles.tag2}`}>dist: 2.3m</div>
            <div className={`${styles.arTag} ${styles.tag3}`}>workflow: wound_care</div>
            <div className={styles.liveLabel}>CLINICAL LENS · LIVE</div>
          </div>
        </div>
      </div>

      {/* Panel 2 — Template matching */}
      <div className={`${styles.panel} ${styles.reverse}`}>
        <div className={`${styles.visual} reveal`} data-reveal="left">
          <div className={styles.glassCard}>
            <div className={styles.cardGlow} />
            <div className={styles.cardGrid} />
            <div className={styles.templateInner}>
              <div className={styles.templateIconWrap}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <div className={styles.templateTag}>WORKFLOW ACTIVE</div>
              <div className={styles.templateTitle}>Case #0047</div>
              <div className={styles.templateSub}>Scale calibrated · redaction ready · case-tagged</div>
              <div className={styles.templateChips}>
                <div className={`${styles.chip} ${styles.chipPrimary}`}>Wound Care</div>
                <div className={`${styles.chip} ${styles.chipAccent}`}>Scale on</div>
                <div className={`${styles.chip} ${styles.chipNeutral}`}>0.2mm/px</div>
              </div>
            </div>
          </div>
        </div>
        <div className={`${styles.text} reveal`} data-reveal="right">
          <span className={sectionStyles.eyebrow}>Workflow Intelligence</span>
          <h3>
            Pick the workflow,
            <br />
            get the right fields.
          </h3>
          <p>
            Wound care, dermatology, specimen, microscopy, gel/blot — choosing a workflow
            sets what the lens looks for, which clinical preset it opens, and which case-info
            fields it expects, so nothing general-purpose gets in the way of documentation.
          </p>
          <a href="#video-section" className={styles.learnLink}>
            See detection specs
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* Panel 3 — Privacy */}
      <div className={styles.panel}>
        <div className={`${styles.text} reveal`} data-reveal="left">
          <span className={sectionStyles.eyebrow}>Privacy Architecture</span>
          <h3>
            Your eyes only.
            <br />
            Truly.
          </h3>
          <p>
            Every computation runs in a sandboxed WebAssembly module inside your own
            browser. No image is ever transmitted to any server. No API key is required.
            Your templates live in your device&apos;s encrypted IndexedDB — not our cloud.
          </p>
          <a href="#about-section" className={styles.learnLink}>
            Read our privacy vision
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        <div className={`${styles.visual} reveal`} data-reveal="right">
          <div className={styles.glassCard}>
            <div className={`${styles.cardGlow} ${styles.accent}`} />
            <div className={styles.privacyList}>
              <div className={styles.privacyRow}>
                <div className={styles.privacyIcon} style={{ background: 'rgba(var(--primary-rgb),0.12)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div className={styles.privacyTitle}>On-device WASM</div>
                  <div className={styles.privacySub}>Zero network calls</div>
                </div>
                <div className={styles.privacyBadge} style={{ color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.1)' }}>
                  Active
                </div>
              </div>
              <div className={styles.privacyRow}>
                <div className={styles.privacyIcon} style={{ background: 'rgba(var(--accent-rgb),0.12)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div className={styles.privacyTitle}>Encrypted IndexedDB</div>
                  <div className={styles.privacySub}>Local templates only</div>
                </div>
                <div className={styles.privacyBadge} style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.1)' }}>
                  Secured
                </div>
              </div>
              <div className={styles.privacyRow}>
                <div className={styles.privacyIcon} style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                </div>
                <div>
                  <div className={styles.privacyTitle}>No telemetry</div>
                  <div className={styles.privacySub}>No analytics, ever</div>
                </div>
                <div className={styles.privacyBadge} style={{ color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)' }}>
                  Verified
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
