import type { Component } from "vue"
import { Clock,Box, Cpu, Files, Key, List, MagicStick, Operation, Picture, Tickets, UserFilled } from "@element-plus/icons-vue"

export interface AdminMenuItem {
  title: string
  path: string
  module: string
  icon: Component
}

export interface AdminMenuGroup {
  title: string
  icon: Component
  children: AdminMenuItem[]
}

export type AdminMenuEntry = AdminMenuItem | AdminMenuGroup

export const ADMIN_MENUS: AdminMenuEntry[] = [
  // { title: "common.pxm_account_settings", path: "/settings", module: "setting", icon: Box },
  { title: "common.pxm_nav_works", path: "/works", module: "works", icon: Clock },
  { title: "common.pxm_nav_publish", path: "/publish", module: "publish", icon: Box },
  // { title: "Editortest", path: "/editortest", module: "editortest", icon: Key },
]

export function isMenuGroup(entry: AdminMenuEntry): entry is AdminMenuGroup {
  return "children" in entry
}

export function flattenMenus(entries: AdminMenuEntry[] = ADMIN_MENUS) {
  return entries.flatMap((entry) => (isMenuGroup(entry) ? entry.children : [entry]))
}

export function defaultMenuCodes() {
  return flattenMenus().map((menu) => menu.module)
}

export function firstAllowedPath(menuCodes: string[]) {
  const allowed = new Set(menuCodes)
  return flattenMenus().find((menu) => allowed.has(menu.module))?.path || "/no-permission"
}
