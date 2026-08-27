import { atom } from 'nanostores'

// Shared across independently-hydrated islands — this is how Nav (which
// triggers the menu) and Sidebar (which renders it) coordinate without
// being in the same React tree. Regular useState can't cross island
// boundaries; nanostores is the standard Astro pattern for exactly this.
export const sidebarOpen = atom(false)

export function openSidebar() {
  sidebarOpen.set(true)
}
export function closeSidebar() {
  sidebarOpen.set(false)
}
