/**
 * 路由配置文件
 * 定义应用程序的路由规则和导航守卫
 */
import { createRouter, createWebHistory } from 'vue-router'

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout/index.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/pages/home/index.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'login1',
        name: 'Login1',
        component: () => import('@/pages/login/index.vue'),
        meta: { title: '登录1' }
      }, {
        path: 'login',
        name: 'Login',
        component: () => import('@/pages/auth/LoginPage.vue'),
        meta: { title: '登录' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/pages/settings/index.vue'),
        meta: { title: '设置' }
      },
      {
        path: 'pixel-editor',
        name: 'PixelEditor',
        component: () => import('@/modules/pixel-editor/components/editor/PixelEditor.vue'),
        meta: { title: '像素编辑器' }
      },
      {
        path: ':pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/pages/404/index.vue'),
        meta: { title: '页面未找到' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE}`
  }

  next()
})

export default router
