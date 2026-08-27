import { defineStore } from 'pinia'

export interface BridgeUser {
  id?: string
  name?: string
  email?: string
  avatar?: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as BridgeUser | null,
  }),
  getters: {
    firstName(state): string | null {
      const name = state.user?.name?.trim()
      if (!name) return null
      return name.split(' ')[0]
    },
    initial(state): string {
      const name = state.user?.name?.trim()
      return name ? name[0]!.toUpperCase() : '?'
    },
    greeting(): string {
      const hour = new Date().getHours()
      if (hour < 5) return 'Still up'
      if (hour < 12) return 'Good morning'
      if (hour < 18) return 'Good afternoon'
      return 'Good evening'
    },
  },
  actions: {
    setUser(user: BridgeUser | null | undefined) {
      this.user = user ?? null
    },
  },
})
