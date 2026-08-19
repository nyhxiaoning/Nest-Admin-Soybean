import type { RouteRecordRaw } from "vue-router"
import AdminLayout from "@/layouts/AdminLayout.vue"
import FullscreenLayout from "@/layouts/FullscreenLayout.vue"

export const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    component: () => import("@/pages/auth/LoginPage.vue"),
    meta: { public: true }
  },
  // {
  //   path: "/no-permission",
  //   component: () => import("@/pages/auth/NoPermissionPage.vue"),
  //   meta: { title: "无权限" }
  // },
  {
    path: "/",
    component: AdminLayout,
    redirect: "/settings",
    children: [
      // {
      //   path: 'settings',
      //   name: 'Settings',
      //   component: () => import('@/pages/settings/index.vue'),
      //   meta: { title: '设置' }
      // },

      {
        path: "publish",
        name: "Publish",
        component: () => import("@/pages/publish/index.vue"),
        meta: { title: "发布" }
      },
            {
        path: "works",
        name: "Works",
        component: () => import("@/pages/works/index.vue"),
        meta: { title: "作品" }
      },
      // {
      //   path: "editortest",
      //   name: "EditorTest",
      //   component: () => import("@/pages/editortest/index.vue"),
      //   meta: { title: "编辑器测试" }
      // }
    ]
  },
  {
    path: "/pixel-editor",
    component: FullscreenLayout,
    children: [
      {
        path: '',
        name: 'PixelEditor',
        component: () => import('@/modules/pixel-editor/components/editor/PixelEditor.vue'),
        meta: { title: '像素编辑器' }
      }
    ]
  },

  {
    path: "/:pathMatch(.*)*",
    redirect: "/login"
  }
]
