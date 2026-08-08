import process from 'node:process';
import type { ProxyOptions } from 'vite';
import dayjs from 'dayjs';

/**
 * Get build time
 */
export function getBuildTime() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Create vite proxy
 *
 * @param viteEnv
 * @param enable
 */
export function createViteProxy(viteEnv: Env.ImportMeta, enable: boolean) {
  if (!enable || viteEnv.VITE_HTTP_PROXY !== 'Y') {
    return undefined;
  }

  const { VITE_SERVICE_BASE_URL, VITE_OTHER_SERVICE_BASE_URL } = viteEnv;

  const proxy: Record<string, ProxyOptions> = {};

  const baseApi = (viteEnv as any).VITE_APP_BASE_API || '/api';

  proxy[baseApi] = {
    target: VITE_SERVICE_BASE_URL,
    changeOrigin: true,
    rewrite: path => path
  };

  if (VITE_OTHER_SERVICE_BASE_URL) {
    try {
      const otherService = JSON.parse(VITE_OTHER_SERVICE_BASE_URL) as Record<string, string>;
      Object.entries(otherService).forEach(([prefix, target]) => {
        proxy[prefix] = {
          target,
          changeOrigin: true,
          rewrite: path => path.replace(new RegExp(`^${prefix}`), '')
        };
      });
    } catch {
      // ignore invalid json
    }
  }

  return proxy;
}
