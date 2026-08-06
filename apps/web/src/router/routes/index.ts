import type { CustomRoute, ElegantConstRoute, ElegantRoute } from '@elegant-router/types';
import { generatedRoutes } from '../elegant/routes';
import { layouts, views } from '../elegant/imports';
import { transformElegantRoutesToVueRoutes } from '../elegant/transform';

/**
 * 自定义路由列表（由 @elegant-router 自动生成的文件路由以外的额外路由）
 * 当前为空数组，表示不添加额外自定义路由
 *
 * @link https://github.com/soybeanjs/elegant-router?tab=readme-ov-file#custom-route
 */
const customRoutes: CustomRoute[] = [];

/**
 * 创建静态路由模式下的路由（权限路由模式为 static 时使用）
 * 从 customRoutes 和 generatedRoutes（文件系统自动生成的路由）中，
 * 根据 meta.constant 属性区分：常驻路由（无需登录）和需要鉴权的路由
 *
 * @returns { constantRoutes: ElegantRoute[], authRoutes: ElegantRoute[] }
 *   - constantRoutes: 常驻路由，无需登录即可访问（如登录页、404）
 *   - authRoutes: 需要鉴权的路由，用户登录后才有权限访问
 */
export function createStaticRoutes() {
  const constantRoutes: ElegantRoute[] = [];

  const authRoutes: ElegantRoute[] = [];

  [...customRoutes, ...generatedRoutes].forEach(item => {
    if (item.meta?.constant) {
      constantRoutes.push(item);
    } else {
      authRoutes.push(item);
    }
  });

  return {
    constantRoutes,
    authRoutes
  };
}

/**
 * 动态常驻路由定义列表
 * 当权限路由模式为 dynamic 时，使用此列表中的路由定义
 * 这些路由包括：首页、错误页、登录页、个人中心等基础页面
 *
 * 路由属性说明:
 *   - name: 路由名称，唯一标识，用于路由跳转和 keep-alive
 *   - path: 路由路径，浏览器 URL 匹配
 *   - component: 组件路径，格式 "layout.布局名$view.视图名"，如 "layout.base$view.home" 表示 base 布局下的 home 页面
 *   - props: 是否将 route.params 作为组件 props 传递（仅对参数化路由使用）
 *   - meta: 路由元信息，包含标题、图标、权限等配置
 *     - title: 页面标题，用于浏览器标签栏和面包屑显示
 *     - i18nKey: 国际化 key，用于多语言切换时查找对应翻译文本
 *     - icon: 菜单图标，使用 iconify 图标名称（如 "mdi:monitor-dashboard"）
 *     - constant: 是否为常驻路由（true=无需登录即可访问，false=需要登录鉴权）
 *     - hideInMenu: 是否在侧边菜单中隐藏该路由（true=隐藏，如错误页、登录页）
 *     - keepAlive: 是否缓存该页面（true=切换路由时保持页面状态不销毁）
 *     - order: 菜单排序，数值越小越靠前
 */
const dynamicConstantRoutes: ElegantRoute[] = [
  {
    name: 'home',                                          // 路由名称
    path: '/home',                                         // 路由路径
    component: 'layout.base$view.home',                    // 组件：base 布局下的 home 页面
    meta: {
      title: 'home',                                       // 页面标题
      i18nKey: 'route.home',                               // 国际化 key
      icon: 'mdi:monitor-dashboard',                       // 菜单图标
      constant: true,                                      // 常驻路由，无需登录
      order: 1                                             // 菜单排序，首页排最前
    }
  },
  {
    name: '403',                                           // 路由名称
    path: '/403',                                          // 路由路径
    component: 'layout.blank$view.403',                    // 组件：空白布局下的 403 页面
    meta: {
      title: '403',                                        // 页面标题
      i18nKey: 'route.403',                                // 国际化 key
      constant: true,                                      // 常驻路由，无需登录
      hideInMenu: true                                     // 不在侧边菜单中显示
    }
  },
  {
    name: '404',                                           // 路由名称
    path: '/404',                                          // 路由路径
    component: 'layout.blank$view.404',                    // 组件：空白布局下的 404 页面
    meta: {
      title: '404',                                        // 页面标题
      i18nKey: 'route.404',                                // 国际化 key
      constant: true,                                      // 常驻路由，无需登录
      hideInMenu: true                                     // 不在侧边菜单中显示
    }
  },
  {
    name: '500',                                           // 路由名称
    path: '/500',                                          // 路由路径
    component: 'layout.blank$view.500',                    // 组件：空白布局下的 500 页面
    meta: {
      title: '500',                                        // 页面标题
      i18nKey: 'route.500',                                // 国际化 key
      constant: true,                                      // 常驻路由，无需登录
      hideInMenu: true                                     // 不在侧边菜单中显示
    }
  },
  {
    name: 'login',                                         // 路由名称
    path: '/login/:module(pwd-login|code-login|register|reset-pwd|bind-wechat)?',  // 路由路径：可选参数，支持密码登录/验证码登录/注册/重置密码/绑定微信
    component: 'layout.blank$view.login',                  // 组件：空白布局下的登录页
    props: true,                                           // 将路由参数作为 props 传递给组件，方便获取当前登录模块类型
    meta: {
      title: 'login',                                      // 页面标题
      i18nKey: 'route.login',                              // 国际化 key
      constant: true,                                      // 常驻路由，无需登录
      hideInMenu: true                                     // 不在侧边菜单中显示
    }
  },
  {
    name: 'iframe-page',                                   // 路由名称
    path: '/iframe-page/:url',                             // 路由路径：动态参数，:url 表示要嵌入的 iframe 地址
    component: 'layout.base$view.iframe-page',             // 组件：base 布局下的 iframe 页面
    props: true,                                           // 将路由参数作为 props 传递给组件，方便获取 iframe 地址
    meta: {
      title: 'iframe-page',                                // 页面标题
      i18nKey: 'route.iframe-page',                        // 国际化 key
      constant: true,                                      // 常驻路由，无需登录
      hideInMenu: true,                                    // 不在侧边菜单中显示
      keepAlive: true,                                     // 缓存页面，切换路由后保持 iframe 状态不丢失
      icon: 'material-symbols:iframe-outline'              // 菜单图标
    }
  },
  {
    name: 'social-callback',                               // 路由名称
    path: '/social-callback',                              // 路由路径：第三方社交登录回调地址
    component: 'layout.blank$view.social-callback',        // 组件：空白布局下的社交登录回调页
    meta: {
      title: 'social-callback',                            // 页面标题
      i18nKey: 'route.social-callback',                    // 国际化 key
      constant: true,                                      // 常驻路由，无需登录
      hideInMenu: true,                                    // 不在侧边菜单中显示
      icon: 'simple-icons:authy'                           // 菜单图标
    }
  },
  {
    name: 'user-center',                                   // 路由名称
    path: '/user-center',                                  // 路由路径
    component: 'layout.base$view.user-center',             // 组件：base 布局下的用户中心页
    meta: {
      title: 'user-center',                                // 页面标题
      i18nKey: 'route.user-center',                        // 国际化 key
      icon: 'material-symbols:account-circle-full',        // 菜单图标
      hideInMenu: true                                     // 不在侧边菜单中显示（通常通过个人头像下拉进入）
    }
  }
];

/**
 * 创建动态路由模式下的路由（权限路由模式为 dynamic 时使用）
 * 从 customRoutes 和 dynamicConstantRoutes 中，
 * 根据 meta.constant 属性区分常驻路由和需要鉴权的路由
 *
 * 与 createStaticRoutes 的区别：
 *   - createStaticRoutes 使用 generatedRoutes（文件系统自动扫描生成的路由）
 *   - createDynamicRoutes 使用 dynamicConstantRoutes（本文件手动定义的路由）
 *   dynamic 模式下，鉴权路由由后端动态返回，前端只定义常驻路由
 *
 * @returns { constantRoutes: ElegantConstRoute[], authRoutes: ElegantConstRoute[] }
 *   - constantRoutes: 常驻路由，无需登录即可访问
 *   - authRoutes: 需要鉴权的路由（此处为空，由后端动态返回）
 */
export function createDynamicRoutes() {
  const constantRoutes: ElegantConstRoute[] = [];

  const authRoutes: ElegantConstRoute[] = [];

  [...customRoutes, ...dynamicConstantRoutes].forEach(item => {
    if (item.meta?.constant) {
      constantRoutes.push(item);
    } else {
      authRoutes.push(item);
    }
  });

  return {
    constantRoutes,
    authRoutes
  };
}

/**
 * 将 Elegant 路由格式转换为 Vue Router 可识别的路由格式
 * 调用 transformElegantRoutesToVueRoutes 工具函数，传入路由列表和布局/视图组件映射
 *
 * @param routes - Elegant 格式的路由列表（常驻路由或鉴权路由）
 * @returns Vue Router 格式的路由列表，可直接传给 createRouter
 */
export function getAuthVueRoutes(routes: ElegantConstRoute[]) {
  return transformElegantRoutesToVueRoutes(routes, layouts, views);
}
