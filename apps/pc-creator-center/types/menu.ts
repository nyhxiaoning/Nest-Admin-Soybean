export interface MenuItem {
  readonly key: string
  readonly labelKey: string
  readonly routeName?: string
  readonly path?: string
  readonly icon?: string
  readonly children?: ReadonlyArray<MenuItem>
}

export type MenuMode = 'vertical' | 'horizontal' | 'mix'
