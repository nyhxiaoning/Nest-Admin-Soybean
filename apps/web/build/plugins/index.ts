
import process from 'node:process';
import path from 'node:path';
import type { PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import VueDevtools from 'vite-plugin-vue-devtools';
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import ElegantVueRouter from '@elegant-router/vue/vite';
import UnoCSS from '@unocss/vite';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import progress from 'vite-plugin-progress';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';

/**
 * Setup vite plugins
 *
 * @param viteEnv
 * @param buildTime
 */
export function setupVitePlugins(viteEnv: Env.ImportMeta, _buildTime: string): PluginOption[] {
  const plugins: PluginOption[] = [
    vue({
      script: {
        defineModel: true
      }
    }),
    vueJsx(),
    VueDevtools({
      launchEditor: viteEnv.VITE_DEVTOOLS_LAUNCH_EDITOR || 'code'
    }),
    ElegantVueRouter({
      layouts: {
        base: 'src/layouts/base-layout/index.vue',
        blank: 'src/layouts/blank-layout/index.vue'
      },
      customRoutes: {
        names: ['exception_403', 'exception_404', 'exception_500']
      },
      onCreated() {
        // route files created hook
      }
    }),
    // 自动导入 naive-ui 所有组件，无需手动 import
    Components({
      resolvers: [
       NaiveUiResolver(),
        // 自动识别 icon‑xxx 图标组件，无需import
        IconsResolver({
          prefix: 'icon'
        })
      ]
      // vform3-builds 是 UMD 包，已在 build/index.vue 中通过 defineAsyncComponent 手动加载
      // 无需在此 ignore，避免 unplugin-vue-components 类型不兼容
    } as any),
    Icons({
      autoInstall: true // 缺失图标自动下载
    }),
    UnoCSS(),
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), 'src/assets/svg-icon')],
      symbolId: `${viteEnv.VITE_ICON_LOCAL_PREFIX || 'icon-local'}-[dir]-[name]`
    }),
    progress()
  ];

  return plugins;
}
