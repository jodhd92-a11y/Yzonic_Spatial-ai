'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Mic, LayoutTemplate, Flashlight, Zap } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { TemplatePicker } from './TemplatePicker'
import { ModelPicker } from './ModelPicker'
import { SCAN_TEMPLATES } from '@/store/useAppStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ControlBarProps {
  onLens: () => void
  onFlashlight: () => void
  selectedTemplateId: string
  onSelectTemplate: (id: string) => void
  scanning: boolean
}

export function ControlBar({
  onLens,
  onFlashlight,
  selectedTemplateId,
  onSelectTemplate,
  scanning,
}: ControlBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const selectedTemplate = SCAN_TEMPLATES.find((t) => t.id === selectedTemplateId)
  const { listening, supported: voiceSupported, toggle: toggleVoice } = useVoiceInput((text) => {
    setTranscript(text)
    setTimeout(() => setTranscript(''), 3500)
  })

  return (
    <motion.div
      id="composer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="absolute left-2 right-2 lg:left-1/2 lg:right-auto lg:w-[min(760px,calc(100%-64px))] lg:-translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+14px)]"
    >
      {/* Soft accent glow behind the bar — the bit of "expressiveness"
          that keeps this reading as a premium capture surface instead of
          a flat toolbar, without competing with the primary button. */}
      <div
        className="absolute -inset-x-4 -inset-y-3 -z-10 rounded-[calc(var(--sp-radius-lg)+10px)] opacity-60 blur-2xl pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(79,195,247,0.16), rgba(124,77,255,0.16))' }}
      />
      <div className="relative flex items-center gap-2.5 rounded-[var(--sp-radius-lg)] bg-black/70 backdrop-blur-2xl border border-[var(--sp-border)] shadow-[0_8px_28px_rgba(0,0,0,0.5)] px-2.5 py-2.5 before:absolute before:inset-0 before:rounded-[var(--sp-radius-lg)] before:pointer-events-none before:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {/* Left cluster — the "+" menu and mic sit together as one paired
            input-tool surface (they're both quick, secondary actions),
            then a hairline divider and real breathing room before the
            model picker, which reads as its own distinct control rather
            than another item crammed into the same segment. */}
        <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-0.5 rounded-[var(--sp-radius-sm)] bg-white/[0.03] border border-[var(--sp-border)] p-0.5">
        {/* Expandable menu — square-ish surface, not a glowing blob */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  data-tour="menu-button"
                  className={[
                    'w-11 h-11 rounded-[var(--sp-radius-sm)] flex items-center justify-center shrink-0 border transition-colors duration-150',
                    menuOpen
                      ? 'bg-white/[0.14] border-[var(--sp-border-hover)]'
                      : 'bg-white/[0.06] border-[var(--sp-border)] hover:bg-white/[0.1]',
                  ].join(' ')}
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <motion.span animate={{ rotate: menuOpen ? 45 : 0 }} transition={{ duration: 0.15 }}>
                    <Plus size={20} className="text-white" strokeWidth={2.4} />
                  </motion.span>
                </button>
              }
            />
            <TooltipContent side="top">More options</TooltipContent>
          </Tooltip>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  variants={{
                    hidden: { opacity: 0, y: 6, scale: 0.97 },
                    show: {
                      opacity: 1, y: 0, scale: 1,
                      transition: { duration: 0.14, ease: 'easeOut', staggerChildren: 0.035, delayChildren: 0.02 },
                    },
                  }}
                  className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.55)] p-1.5 flex flex-col gap-0.5 z-20 origin-bottom-left before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none before:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <span className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--sp-text-dim)]">
                    Capture tools
                  </span>

                  <motion.button
                    variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0 } }}
                    whileHover={{ x: 1 }}
                    onClick={() => { setMenuOpen(false); setTemplatePickerOpen(true) }}
                    className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.06] text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--sp-primary)]/12 border border-[var(--sp-primary)]/25 flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105">
                      <LayoutTemplate size={18} className="text-[var(--sp-primary)]" />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[var(--sp-text)] leading-tight">
                        {selectedTemplate ? selectedTemplate.label : 'Set template'}
                      </span>
                      <span className="block text-[11.5px] font-medium text-[var(--sp-text-dim)] truncate leading-tight mt-0.5">
                        {selectedTemplate ? 'Tap to change workflow' : 'Choose a scan workflow'}
                      </span>
                    </span>
                  </motion.button>

                  <motion.button
                    variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0 } }}
                    whileHover={{ x: 1 }}
                    onClick={() => { onFlashlight(); setMenuOpen(false) }}
                    className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.06] text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-[var(--sp-border)] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105">
                      <Flashlight size={18} className="text-[var(--sp-text)]" />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[var(--sp-text)] leading-tight">Torch</span>
                      <span className="block text-[11.5px] font-medium text-[var(--sp-text-dim)] truncate leading-tight mt-0.5">
                        Toggle device flashlight
                      </span>
                    </span>
                  </motion.button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <TemplatePicker
            open={templatePickerOpen}
            selectedId={selectedTemplateId}
            onSelect={onSelectTemplate}
            onClose={() => setTemplatePickerOpen(false)}
          />
        </div>

        {/* Mic button — paired directly with "+" as the two quick,
            secondary input tools. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={toggleVoice}
                disabled={!voiceSupported}
                data-tour="mic-button"
                className={[
                  'relative w-11 h-11 rounded-[var(--sp-radius-sm)] flex items-center justify-center shrink-0 border disabled:opacity-30 transition-colors duration-150',
                  listening
                    ? 'bg-[var(--sp-primary)] border-[var(--sp-primary)] text-black'
                    : 'bg-white/[0.06] border-[var(--sp-border)] hover:bg-white/[0.1] text-white',
                ].join(' ')}
                aria-label="Voice command"
                aria-pressed={listening}
              >
                <Mic size={19} strokeWidth={2.2} />
              </button>
            }
          />
          <TooltipContent side="top">
            {!voiceSupported ? 'Voice not supported' : listening ? 'Listening…' : 'Voice command'}
          </TooltipContent>
        </Tooltip>
        </div>

        {/* Divider + real gap — separates the "+"/mic pair from the model
            picker so it reads as its own distinct control. */}
        <span className="w-px h-6 bg-white/10 shrink-0" />

        {/* Model picker — sits with clear distance from the other input
            tools, same spot Claude anchors its own model selector to the
            composer. */}
        <ModelPicker />
        </div>

        {/* Text / waveform readout — its own breathing room between the
            grouped tool cluster and the primary capture action. */}
        <div className="flex-1 min-w-0 px-1">
          <AnimatePresence mode="wait">
            {listening ? (
              <motion.div
                key="waveform"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-[3px] h-4"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="w-[2px] rounded-full bg-[var(--sp-primary)]"
                    animate={{ height: ['30%', '100%', '30%'] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.span
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13.5px] font-semibold text-[var(--sp-text-dim)] truncate block"
              >
                {transcript || 'Say "measure this wound" or "read this monitor"'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Primary capture action — the one element still allowed to be
            fully round and to carry the accent gradient; everything else
            in the bar is now restrained so this stays the clear focal
            point instead of competing with a dock full of glowing pills. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <motion.button
                onClick={onLens}
                disabled={scanning}
                data-tour="lens-button"
                whileHover={{ scale: scanning ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className={[
                  'relative w-14 h-14 rounded-full flex items-center justify-center shrink-0',
                  scanning ? 'bg-[var(--sp-bg-2)] border border-[var(--sp-primary)]' : 'bg-[var(--sp-primary)] shadow-[0_0_0_4px_rgba(var(--sp-primary-rgb),0.14),0_4px_18px_rgba(var(--sp-primary-rgb),0.4)]',
                ].join(' ')}
                aria-label="AI Lens — scan center of frame"
                aria-pressed={scanning}
              >
                {scanning ? (
                  <motion.div
                    className="w-4 h-4 rounded-[3px] bg-[var(--sp-primary)]"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <Zap size={22} className="text-black" fill="black" strokeWidth={2.2} />
                )}
              </motion.button>
            }
          />
          <TooltipContent side="top">{scanning ? 'Scanning…' : 'Scan'}</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  )
}
