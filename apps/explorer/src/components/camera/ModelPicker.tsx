'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Model selector, relocated from the TopBar into the camera control bar —
 * right where Claude puts it: anchored to the composer, next to the other
 * input tools, instead of floating in a page header. The dropdown opens
 * upward since it now lives at the bottom of the screen.
 */
export function ModelPicker() {
  const models = useAppStore((s) => s.models)
  const selectedModelId = useAppStore((s) => s.selectedModelId)
  const selectModel = useAppStore((s) => s.selectModel)
  const [open, setOpen] = useState(false)
  const selected = models.find((m) => m.id === selectedModelId) ?? models[0]

  return (
    <div className="relative shrink-0" data-tour="model-picker">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={[
                'h-11 flex items-center gap-1.5 pl-1.5 pr-2.5 rounded-[var(--sp-radius-sm)] border transition-colors duration-150',
                open
                  ? 'bg-white/[0.14] border-[var(--sp-border-hover)]'
                  : 'bg-white/[0.06] border-[var(--sp-border)] hover:bg-white/[0.1]',
              ].join(' ')}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] flex items-center justify-center text-[12px] font-bold text-black shrink-0">
                {selected.avatar}
              </div>
              <span className="block font-mono tracking-tight text-[13px] font-bold text-white leading-tight max-w-[92px] truncate">
                {selected.name}
              </span>
              <ChevronDown
                size={14}
                strokeWidth={2.4}
                className={`text-[var(--sp-text)] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
              />
            </button>
          }
        />
        <TooltipContent side="top">Model: {selected.name}</TooltipContent>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              role="listbox"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: { opacity: 0, y: 6, scale: 0.97 },
                show: {
                  opacity: 1, y: 0, scale: 1,
                  transition: { duration: 0.14, ease: 'easeOut', staggerChildren: 0.04, delayChildren: 0.02 },
                },
              }}
              className="absolute bottom-full left-0 mb-2 w-[min(224px,calc(100vw-140px))] rounded-[var(--sp-radius-md)] border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] overflow-hidden z-20 origin-bottom-left"
            >
              {models.map((model) => (
                <motion.button
                  key={model.id}
                  role="option"
                  aria-selected={model.id === selectedModelId}
                  variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    selectModel(model.id)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/[0.06] transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] flex items-center justify-center text-[12px] font-bold text-black shrink-0">
                    {model.avatar}
                  </div>
                  <div className="flex flex-col leading-tight flex-1">
                    <span className="font-mono tracking-tight text-[13.5px] font-semibold text-[var(--sp-text)]">{model.name}</span>
                    <span className="text-[11px] font-medium text-[var(--sp-text-dim)]">{model.vendor}</span>
                  </div>
                  {model.id === selectedModelId && <Check size={15} strokeWidth={2.4} className="text-[var(--sp-primary)]" />}
                </motion.button>
              ))}

              {/* Tanger 7 — not selectable yet, shown so people know it's on the way */}
              <motion.div
                variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 cursor-not-allowed opacity-50"
              >
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[12px] font-bold text-[var(--sp-text-faint)] shrink-0">
                  T
                </div>
                <div className="flex flex-col leading-tight flex-1">
                  <span className="font-mono tracking-tight text-[13px] font-medium text-[var(--sp-text)]">Tanger 7</span>
                  <span className="text-[10.5px] text-[var(--sp-text-faint)]">Nexus</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9.5px] font-medium uppercase tracking-wide text-[var(--sp-text-faint)]">
                  Coming soon
                </span>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
