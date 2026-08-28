import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import Inspector from 'vite-plugin-vue-inspector'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载当前 mode 对应的环境变量
  const env = loadEnv(mode, process.cwd(), '')

  function useInspector() {
    if (env?.VITE_APP_ENV === 'development') {
      return Inspector()
    }
  }

  return {
    base: './',
    plugins: [
      useInspector(),
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
        dts: true,
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: true,
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@@': resolve(__dirname, 'src/common'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/common/assets/styles/variables.scss" as *;`,
        },
      },
    },
    server: {
      port: 3036,
      open: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
        },
        // 没有经过通过的接口请求，所以没有拦截，这里是一个愚蠢的方法，想一想，这个不是接口所以
        '/profile': {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
  }
})
