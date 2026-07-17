'use client'

import { AnimatePresence } from 'framer-motion'
import { useWindowStore } from '@/lib/store/windows'
import { Window } from './Window'

export function Desktop() {
  const { windows, openWindow } = useWindowStore()

  return (
    <div className="relative w-screen h-screen bg-neutral-950 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {windows.map((win) => (
          <Window key={win.id} win={win} />
        ))}
      </AnimatePresence>

      {/* Temporary test button — we'll replace with a real dock next */}
      <button
        onClick={() =>
          openWindow({
            id: `window-${Date.now()}`,
            title: 'Test App',
            x: 100,
            y: 100,
            width: 400,
            height: 300,
          })
        }
        className="absolute bottom-4 left-4 px-4 py-2 bg-neutral-800 text-white rounded-lg"
      >
        + Open Window
      </button>
    </div>
  )
}