import { create } from 'zustand'

export interface WindowState {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  minimized: boolean
  maximized: boolean
}

interface WindowStore {
  windows: WindowState[]
  nextZIndex: number
  openWindow: (win: Omit<WindowState, 'zIndex' | 'minimized' | 'maximized'>) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (id: string, width: number, height: number) => void
  minimizeWindow: (id: string) => void
  toggleMaximize: (id: string) => void
}

export const useWindowStore = create<WindowStore>((set) => ({
  windows: [],
  nextZIndex: 1,

  openWindow: (win) =>
  set((state) => {
    const existing = state.windows.find((w) => w.id === win.id)

    if (existing) {
      // Already open — restore if minimized, and always bring to front
      return {
        windows: state.windows.map((w) =>
          w.id === win.id
            ? { ...w, minimized: false, zIndex: state.nextZIndex }
            : w
        ),
        nextZIndex: state.nextZIndex + 1,
      }
    }

    // Genuinely new window
    return {
      windows: [
        ...state.windows,
        { ...win, zIndex: state.nextZIndex, minimized: false, maximized: false },
      ],
      nextZIndex: state.nextZIndex + 1,
    }
  }),

  closeWindow: (id) =>
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    })),

  focusWindow: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: state.nextZIndex } : w
      ),
      nextZIndex: state.nextZIndex + 1,
    })),

  moveWindow: (id, x, y) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  resizeWindow: (id, width, height) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    })),

  minimizeWindow: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w
      ),
    })),

  toggleMaximize: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized } : w
      ),
    })),
}))
