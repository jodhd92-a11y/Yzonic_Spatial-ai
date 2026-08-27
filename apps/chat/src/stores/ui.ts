import { defineStore } from 'pinia'

const COLLAPSE_KEY = 'sp-sidebar-collapsed'
const GROUP_MODE_KEY = 'sp-chat-group-mode'

export type ChatGroupMode = 'date' | 'none'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function readGroupMode(): ChatGroupMode {
  try {
    const v = localStorage.getItem(GROUP_MODE_KEY)
    return v === 'none' ? 'none' : 'date'
  } catch {
    return 'date'
  }
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false,
    sidebarCollapsed: readCollapsed(),
    chatGroupMode: readGroupMode(),
    modelPickerOpen: false,
    commandPaletteOpen: false,
    settingsOpen: false,
  }),
  actions: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },
    closeSidebar() {
      this.sidebarOpen = false
    },
    toggleCollapsed() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      try {
        localStorage.setItem(COLLAPSE_KEY, this.sidebarCollapsed ? '1' : '0')
      } catch {
        /* ignore */
      }
    },
    setChatGroupMode(mode: ChatGroupMode) {
      this.chatGroupMode = mode
      try {
        localStorage.setItem(GROUP_MODE_KEY, mode)
      } catch {
        /* ignore */
      }
    },
  },
})
