import type { ProxyOptions } from 'vite';
import dayjs from 'dayjs';

type ProxyItem = [string, string];

type ProxyList = ProxyItem[];

type ProxyTargetList = Record<string, ProxyOptions>;

/**
 * Create Vite proxy for development
 * @param viteEnv - Vite environment variables
 * @param enable - Whether to enable proxy
 */
export function createViteProxy(viteEnv: Env.ImportMeta, enable: boolean): ProxyTargetList | undefined {
  if (!enable) return undefined;

  const baseApi = viteEnv.VITE_APP_BASE_API;
  const apiPrefix = '/api';

  const proxyList: ProxyList = [['/api', viteEnv.VITE_SERVICE_BASE_URL]];

  if (baseApi) {
    proxyList.push([baseApi, viteEnv.VITE_SERVICE_BASE_URL]);
  }

  const proxy: ProxyTargetList = {};

  for (const [prefix, target] of proxyList) {
    const isHttps = target.startsWith('https');

    proxy[prefix] = {
      target,
      changeOrigin: true,
      ws: true,
      // 后端已移除 URI 版本控制（无 /v1 版本），统一使用 /api 前缀。
      // 前端自定义前缀（如 /dev-api）移除后，直接转发到后端 /api 路径。
      rewrite: path => `${apiPrefix}${path.replace(new RegExp(`^${prefix}`), '')}`,
      ...(isHttps ? { secure: false } : {})
    };
  }

  return proxy;
}

/** Get the current build time */
export function getBuildTime() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}
