import styles from './AboutSection.module.css'
import { useReveal } from '../hooks/useReveal'
import { appLinks } from '../lib/app-links'

const visionBlocks = [
  {
    title: 'Vision for Clinical Practice',
    body: 'I believe technology should expand clinical and research capability without compromising patient dignity. Spatial AI Explorer is proof that powerful documentation tooling and radical privacy are not opposites — they are complements. My goal is a world where every clinician and researcher can capture a properly measured, de-identifiable, case-tagged photo in seconds, at the bedside or the bench.',
  },
  {
    title: 'Privacy as a Human Right',
    body: "Every camera access, every case note, every scan you capture stays on your device. I designed Yzonic's architecture from first principles around this axiom: patient and specimen data is never for sale, never for training models, never transmitted without explicit consent. Privacy is not a compliance checkbox — it is the foundation of trust, and trust is the foundation of everything we build.",
  },
  {
    title: 'Security Commitment',
    body: 'Our WASM sandbox, strict Content Security Policy, and zero external dependency model mean Spatial AI Explorer has an attack surface measured in kilobytes, not megabytes. Regular third-party audits, open-source code, and transparent changelogs are not aspirational goals — they are our minimum standard for anything touching clinical data.',
  },
]

const footerColumns = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features-section' },
      { label: 'Technology', href: '#showcase-section' },
      { label: 'Launch App', href: appLinks.signup },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#about-section' },
      { label: 'Yzonic.corp', href: '#' },
      { label: 'Open Source', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    heading: 'Privacy',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Terms of Use', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
]

function LogoMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none">
      <circle className={styles.logoRing} cx="14" cy="14" r="12" strokeWidth="1.5" />
      <polygon className={styles.logoStarGlow} points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5" />
      <polygon className={styles.logoStar} points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5" />
    </svg>
  )
}

export function AboutSection() {
  const ref = useReveal()

  return (
    <section id="about-section" className={styles.section} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.top}>
        <div className={`${styles.left} reveal`} data-reveal="left">
          <h2>
            Built by <span className="accent">Yzonic.corp</span>
            <br />
            for clinicians &amp; researchers.
          </h2>
          <p>
            Yzonic.corp was founded with a single conviction: that clinical and biotech
            documentation deserves purpose-built tooling — not a repurposed consumer camera app,
            and not invasive surveillance, but respectful, intelligent, on-device computation.
          </p>
          <p>
            We believe camera-based documentation is not a gadget feature. It is core clinical
            and lab infrastructure — as essential as the chart, as precise as the caliper. We are
            building it the right way: private, accurate, and fast.
          </p>
          <div className={styles.founderChip}>
            <div className={styles.avatar}>AH</div>
            <span>Alexnaghis Huang — Founder &amp; Chief Architect</span>
          </div>
        </div>

        <div className={`${styles.right} reveal`} data-reveal="right">
          {visionBlocks.map((block) => (
            <div className={styles.visionBlock} key={block.title}>
              <h4>{block.title}</h4>
              <p>{block.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footerGrid}>
        <div>
          <div className={styles.logo}>
            <LogoMark />
            <span>Spatial AI Explorer</span>
          </div>
          <p className={styles.brandDesc}>
            Point your camera, document the case. Built by Yzonic.corp — private, precise, and
            entirely on your device.
          </p>
        </div>

        {footerColumns.map((col) => (
          <div className={styles.col} key={col.heading}>
            <h5>{col.heading}</h5>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.bottom}>
        <p>© 2025 Yzonic.corp. All rights reserved. Spatial AI Explorer is an open-source project by Alexnaghis Huang.</p>
        <p>
          <a href="#">Privacy</a> &nbsp;·&nbsp; <a href="#">Terms</a> &nbsp;·&nbsp; <a href="#">Security</a>
        </p>
      </div>
    </section>
  )
}
