'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  X,
  Search,
  LayoutTemplate,
  Bandage,
  FlaskConical,
  Stethoscope,
  Syringe,
  Microscope,
  Activity,
  Pill,
  IdCard,
  ShieldCheck,
  TestTube,
  Dna,
  ClipboardList,
  ScanLine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SCAN_TEMPLATES, SCAN_CATEGORY_LABELS, type ScanCategory } from '@/store/useAppStore'

interface TemplateStyle {
  icon: LucideIcon
  gradient: string
  glow: string
}

// Every id here maps 1:1 to a real clinical, surgical, laboratory, or
// biotech workflow — there is no general-purpose entry (no "code",
// no "shopping"). This app is scoped to doctors, surgeons, medical
// students, scientists, and researchers only.
const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  wound: {
    icon: Bandage,
    gradient: 'from-rose-400 to-red-500',
    glow: 'shadow-[0_0_24px_rgba(251,113,133,0.45)]',
  },
  dermatology: {
    icon: Stethoscope,
    gradient: 'from-sky-400 to-blue-500',
    glow: 'shadow-[0_0_24px_rgba(56,189,248,0.45)]',
  },
  monitor: {
    icon: Activity,
    gradient: 'from-lime-400 to-emerald-500',
    glow: 'shadow-[0_0_24px_rgba(163,230,53,0.45)]',
  },
  medlabel: {
    icon: Pill,
    gradient: 'from-orange-400 to-amber-500',
    glow: 'shadow-[0_0_24px_rgba(251,146,60,0.45)]',
  },
  idcheck: {
    icon: IdCard,
    gradient: 'from-slate-400 to-slate-500',
    glow: 'shadow-[0_0_24px_rgba(148,163,184,0.45)]',
  },
  surgical: {
    icon: Syringe,
    gradient: 'from-cyan-400 to-teal-500',
    glow: 'shadow-[0_0_24px_rgba(45,212,191,0.45)]',
  },
  ppe: {
    icon: ShieldCheck,
    gradient: 'from-teal-400 to-cyan-600',
    glow: 'shadow-[0_0_24px_rgba(45,212,191,0.45)]',
  },
  specimen: {
    icon: FlaskConical,
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.45)]',
  },
  microscopy: {
    icon: Microscope,
    gradient: 'from-fuchsia-400 to-purple-500',
    glow: 'shadow-[0_0_24px_rgba(232,121,249,0.45)]',
  },
  gel: {
    icon: TestTube,
    gradient: 'from-violet-400 to-indigo-500',
    glow: 'shadow-[0_0_24px_rgba(167,139,250,0.45)]',
  },
  culture: {
    icon: Dna,
    gradient: 'from-purple-400 to-fuchsia-500',
    glow: 'shadow-[0_0_24px_rgba(192,132,252,0.45)]',
  },
  labresult: {
    icon: ClipboardList,
    gradient: 'from-blue-400 to-indigo-500',
    glow: 'shadow-[0_0_24px_rgba(96,165,250,0.45)]',
  },
  radiograph: {
    icon: ScanLine,
    gradient: 'from-zinc-400 to-slate-600',
    glow: 'shadow-[0_0_24px_rgba(161,161,170,0.45)]',
  },
}

interface TemplatePickerProps {
  open: boolean
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export function TemplatePicker({ open, selectedId, onSelect, onClose }: TemplatePickerProps) {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<ScanCategory | 'all'>('all')

  const categories = Object.keys(SCAN_CATEGORY_LABELS) as ScanCategory[]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SCAN_TEMPLATES.filter((t) => {
      const matchesCat = activeCat === 'all' || t.category === activeCat
      const matchesQuery =
        !q || t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      return matchesCat && matchesQuery
    })
  }, [query, activeCat])

  const handleClose = () => {
    setQuery('')
    setActiveCat('all')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <motion.div
            data-tour="template-picker"
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="absolute bottom-full left-0 mb-3 w-[min(376px,calc(100vw-32px))] rounded-[calc(var(--sp-radius-lg)+4px)] border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden z-50 origin-bottom-left"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--sp-primary)]/25 to-[var(--sp-accent)]/25 border border-[var(--sp-primary)]/30 flex items-center justify-center shrink-0">
                <LayoutTemplate size={15} className="text-[var(--sp-primary)]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold text-[var(--sp-text)] leading-tight">Choose a workflow</h3>
                <p className="text-[11.5px] text-[var(--sp-text-faint)] leading-tight">Shapes what the lens looks for and which presets it opens</p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close template picker"
                className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-[var(--sp-text-faint)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-hover)] transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search — quick filter across name + description, same
                fuzzy-by-substring pattern as Claude/Cursor's own
                command palettes. */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search size={13.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sp-text-faint)]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search workflows…"
                  className="w-full h-9 rounded-xl bg-white/[0.04] border border-[var(--sp-border)] pl-8 pr-3 text-[13px] text-[var(--sp-text)] placeholder:text-[var(--sp-text-faint)] outline-none focus:border-[var(--sp-primary)]/50 focus:bg-white/[0.06] transition-colors"
                />
              </div>
            </div>

            {/* Category pills — horizontally scrollable, active pill tracked
                with a shared layoutId so it glides between tabs instead of
                popping, matching Claude/Cursor's tab-switch feel. */}
            <div className="flex items-center gap-1.5 px-5 pb-3.5 overflow-x-auto no-scrollbar">
              <CategoryPill label="All" active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
              {categories.map((cat) => (
                <CategoryPill
                  key={cat}
                  label={SCAN_CATEGORY_LABELS[cat]}
                  active={activeCat === cat}
                  onClick={() => setActiveCat(cat)}
                />
              ))}
            </div>

            <div className="h-px bg-[var(--sp-border)]" />

            {/* Template cards */}
            <div className="px-2.5 py-2.5 max-h-[48vh] overflow-y-auto flex flex-col gap-1 no-scrollbar">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 text-center text-[12.5px] text-[var(--sp-text-faint)]"
                  >
                    No workflows match “{query}”
                  </motion.div>
                ) : (
                  filtered.map((tpl, i) => {
                    const style = TEMPLATE_STYLES[tpl.id] ?? TEMPLATE_STYLES.wound
                    const Icon = style.icon
                    const active = selectedId === tpl.id
                    return (
                      <motion.button
                        key={tpl.id}
                        layout
                        data-tour="template-option"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ delay: 0.015 * i, duration: 0.18, ease: 'easeOut' }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          onSelect(tpl.id)
                          handleClose()
                        }}
                        className={[
                          'group relative w-full flex items-center gap-3 px-3.5 py-3 rounded-[var(--sp-radius-md)] text-left transition-colors',
                          active ? 'bg-[var(--sp-surface-hover)]' : 'hover:bg-[var(--sp-surface)]',
                        ].join(' ')}
                      >
                        {active && (
                          <motion.div
                            layoutId="template-active-ring"
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            className="absolute inset-0 rounded-[var(--sp-radius-md)] ring-1 ring-inset ring-[var(--sp-primary)]/50 pointer-events-none"
                          />
                        )}
                        <div
                          className={[
                            'relative w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform duration-200',
                            style.gradient,
                            active ? style.glow : '',
                            'group-hover:scale-[1.06]',
                          ].join(' ')}
                        >
                          <Icon size={19} className="text-black" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-semibold text-[var(--sp-text)]">{tpl.label}</span>
                            {tpl.id === 'wound' && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[var(--sp-surface)] border border-[var(--sp-border)] text-[9px] font-medium uppercase tracking-wide text-[var(--sp-text-faint)]">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-[var(--sp-text-faint)] truncate">{tpl.description}</p>
                        </div>
                        <div
                          className={[
                            'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
                            active ? 'bg-[var(--sp-primary)] scale-100 opacity-100' : 'scale-75 opacity-0 group-hover:opacity-40',
                          ].join(' ')}
                        >
                          <Check size={13} className="text-black" strokeWidth={3} />
                        </div>
                      </motion.button>
                    )
                  })
                )}
              </AnimatePresence>
            </div>

            <div className="px-5 pb-4 pt-1 text-center text-[11px] text-[var(--sp-text-faint)]">
              More clinical & lab workflows arriving soon
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative shrink-0 px-3 py-1.5 rounded-full text-[11.5px] font-medium whitespace-nowrap transition-colors',
        active ? 'text-black' : 'text-[var(--sp-text-faint)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-hover)]',
      ].join(' ')}
    >
      {active && (
        <motion.span
          layoutId="template-cat-pill"
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="absolute inset-0 rounded-full bg-[var(--sp-primary)]"
        />
      )}
      <span className="relative">{label}</span>
    </button>
  )
}