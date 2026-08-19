import { createRouter, createWebHashHistory } from "vue-router"
import { firstAllowedPath } from "@/shared/manage-menu"
import { useUserStore } from "@/pinia/modules/user"
import { routes } from "./routes"

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  // todo:不交验，直接进入系统，待修改

  // return true;

  const userStore = useUserStore()
  // alert(JSON.stringify(userStore))

  if (to.meta.public) return true
  if (!userStore.token) {
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }
  if (to.path === "/no-permission") return true

  return true
})
