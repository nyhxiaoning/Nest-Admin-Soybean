import type { MenuItem } from '@/types/menu'

export const MENU_ITEMS: MenuItem[] = [
  {
    key: 'home',
    labelKey: 'components.navigation.home',
    routeName: 'Home',
    icon: 'House'
  },
  {
    key: 'pixel-editor',
    labelKey: 'components.navigation.pixelEditor',
    routeName: 'PixelEditor',
    icon: 'Brush'
  },
  {
    key: 'settings',
    labelKey: 'components.navigation.settings',
    routeName: 'Settings',
    icon: 'Setting'
  },
  {
    key: 'profile',
    labelKey: 'components.navigation.profile',
    routeName: 'Login',
    icon: 'User'
  }
]
