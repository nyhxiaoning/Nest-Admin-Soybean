import type { MenuMode } from '../../../types/menu'
import { defineStore } from 'pinia'

interface AppState {
  menuMode: MenuMode
  menuCollapsed: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    menuMode: 'vertical',
    menuCollapsed: false
  }),
  actions: {
    setMenuMode(mode: MenuMode) {
      this.menuMode = mode
    },
    setMenuCollapsed(val: boolean) {
      this.menuCollapsed = val
    }
  }
})
