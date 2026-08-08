import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import UnoCSS from '@unocss/vite';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import viteProgressBar from 'vite-plugin-progress';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import type { PluginOption } from 'vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Setup Vite plugins
 * @param viteEnv - Vite environment variables
 * @param buildTime - Build time string
 */
export function setupVitePlugins(viteEnv: Env.ImportMeta, buildTime: string): PluginOption[] {
  const plugins: PluginOption[] = [
    vue(),
    vueJsx(),
    UnoCSS(),
    createSvgIconsPlugin({
      iconDirs: [fileURLToPath(new URL('../src/svg', import.meta.url))],
      symbolId: `${viteEnv.VITE_ICON_LOCAL_PREFIX}-[dir]-[name]`
    }),
    viteProgressBar(),
    // ─── unplugin-vue-components: 自动导入 naive-ui 组件 ───
    // 无需手动 import { NButton, NMenu, NTable ... } from 'naive-ui'
    // 模板中使用 <NButton> 等组件时自动解析并注入
    Components({
      resolvers: [
        NaiveUiResolver({
          // 按需导入组件，减小打包体积
          importStyle: true,     // 自动导入对应组件的样式
          // 排除不需要自动导入的组件（按需排除）
          exclude: [],
        }),
      ],
      // 生成类型声明文件，供 TS 识别自动导入的组件
      dts: fileURLToPath(new URL('../src/typings/components.d.ts', import.meta.url)),
      // 扫描项目内所有 .vue、.tsx 文件
      include: [
        /\.vue$/,
        /\.tsx$/,
      ],
      // 全局组件目录（项目内可复用的自定义组件自动导入）
      dirs: [
        fileURLToPath(new URL('../src/components', import.meta.url)),
      ],
      // 是否生成组件导入的 import 语句（false = 纯按需注册，无需 import）
      importSource: undefined,
    }),
  ];

  return plugins;
}