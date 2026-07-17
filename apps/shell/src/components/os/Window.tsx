'use client'

import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useWindowStore, WindowState } from '@/lib/store/windows'

export function Window({ win }: { win: WindowState }) {
  const { closeWindow, focusWindow, moveWindow, minimizeWindow, toggleMaximize } =
    useWindowStore()
  const dragRef = useRef<HTMLDivElement>(null)

  if (win.minimized) return null

  return (
    <motion.div
      ref={dragRef}
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        moveWindow(win.id, win.x + info.offset.x, win.y + info.offset.y)
      }}
      onMouseDown={() => focusWindow(win.id)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'absolute',
        left: win.maximized ? 0 : win.x,
        top: win.maximized ? 0 : win.y,
        width: win.maximized ? '100vw' : win.width,
        height: win.maximized ? '100vh' : win.height,
        zIndex: win.zIndex,
      }}
      className="rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800 cursor-move select-none">
        <button
          onClick={() => closeWindow(win.id)}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400"
        />
        <button
          onClick={() => minimizeWindow(win.id)}
          className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400"
        />
        <button
          onClick={() => toggleMaximize(win.id)}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400"
        />
        <span className="ml-2 text-sm text-neutral-300">{win.title}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 text-neutral-200">
        <p>Content for {win.title} goes here.</p>
      </div>
    </motion.div>
  )
}