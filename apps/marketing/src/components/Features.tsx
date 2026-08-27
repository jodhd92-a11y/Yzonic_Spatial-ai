import styles from './Features.module.css'
import sectionStyles from './Section.module.css'
import { useReveal } from '../hooks/useReveal'

const features = [
  {
    num: '01',
    title: 'On-Device AI Engine',
    desc: 'WebAssembly-compiled computer vision runs natively in your browser. Zero round-trips, zero data leaves your device — patient and specimen photos never touch a server unless you choose to sync them.',
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M1.05 12H5M19 12h2.95M12 1.05V5M12 19v2.95" />
        <path d="m4.22 4.22 2.83 2.83M16.95 16.95l2.83 2.83M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Clinical Workflow Templates',
    desc: 'Wound care, dermatology, surgical field, specimen, microscopy, gel/blot, and more — each workflow sets what the lens looks for and which case-info fields it expects, instead of one generic "detect anything" mode.',
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Real-World Measurement',
    desc: 'Calibrate against a ruler, coin, or scale sticker in frame and every annotation — and the on-image scale bar — reads in millimetres, not just pixels.',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Voice-Driven Capture',
    desc: 'Hands full during a procedure? Speak the instruction — "measure this wound," "read this monitor" — and the lens acts on what the camera sees.',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Case Info, Markup & Redaction',
    desc: 'Attach case/specimen ID, body site, modality, and notes; mark up ROI, arrows, and measurements; redact identifying details before a photo is shared or filed for teaching.',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    num: '06',
    title: 'Private by Design',
    desc: 'Every pixel stays on your device unless you choose otherwise. No analytics, no profiling, no telemetry on patient or specimen imagery — encrypted local storage only.',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

export function Features() {
  const ref = useReveal()

  return (
    <section id="features-section" className={styles.features} ref={ref as React.RefObject<HTMLElement>}>
      <div className={sectionStyles.sectionInner}>
        <span className={`${sectionStyles.eyebrow} reveal`}>Core Capabilities</span>
        <h2 className={`${sectionStyles.h2} reveal`}>
          Built for the exam room.
          <br />
          Works <span className="accent">at the bench.</span>
        </h2>
        <p className={`${sectionStyles.body} reveal`}>
          Spatial AI Explorer runs entirely on your device — no cloud, no servers, no
          compromises. Built exclusively for doctors, surgeons, medical students,
          scientists, and researchers — not a general-purpose camera app.
        </p>

        <div className={styles.grid}>
          {features.map((f) => (
            <div key={f.num} className={`${styles.card} reveal`}>
              <span className={styles.num}>{f.num}</span>
              <div className={styles.icon}>{f.icon}</div>
              <div className={styles.title}>{f.title}</div>
              <div className={styles.desc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
