import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { fetchAuthLogin, fetchAuthLogout, fetchUserGetInfo } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { localStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import useNoticeStore from '../notice';
import { clearAuthStorage, getToken } from './shared';

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const authStore = useAuthStore();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const noticeStore = useNoticeStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = ref(getToken());

  const userInfo: Api.Auth.UserInfo = reactive({
    user: undefined,
    roles: [],
    permissions: []
  });

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;

    return VITE_AUTH_ROUTE_MODE === 'static' && userInfo.roles.includes(VITE_STATIC_SUPER_ROLE);
  });

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** Reset auth store */
  async function resetStore() {
    recordUserId();

    clearAuthStorage();

    authStore.$reset();

    if (!route.meta.constant) {
      await toLogin();
    }

    noticeStore.clearNotice();
    tabStore.cacheTabs();
    routeStore.resetStore();
  }

  async function logout() {
    await fetchAuthLogout();
    resetStore();
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.user?.userId) {
      return;
    }

    // Store current user ID locally for next login comparison
    localStg.set('lastLoginUserId', userInfo.user?.userId);
  }

  /**
   * Check if current login user is different from previous login user If different, clear all tabs
   *
   * @returns {boolean} Whether to clear all tabs
   */
  function checkTabClear(): boolean {
    if (!userInfo.user?.userId) {
      return false;
    }

    const lastLoginUserId = localStg.get('lastLoginUserId');

    // Clear all tabs if current user is different from previous user
    if (!lastLoginUserId || lastLoginUserId !== userInfo.user?.userId) {
      localStg.remove('globalTabs');
      tabStore.clearTabs();

      localStg.remove('lastLoginUserId');
      return true;
    }

    localStg.remove('lastLoginUserId');
    return false;
  }

  /**
   * Login
   *
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function login(loginForm: Api.Auth.LoginParams, redirect = true) {
    startLoading();

    const { VITE_APP_CLIENT_ID } = import.meta.env;

    const loginData: Api.Auth.LoginParams = {
      ...loginForm,
      tenantId: loginForm.tenantId ?? '000000',
      clientId: VITE_APP_CLIENT_ID!,
      grantType: loginForm.grantType ?? 'password'
    };

    try {
      const { data: loginToken } = await fetchAuthLogin(loginData);

      if (!loginToken) {
        window.$message?.error('登录失败，未返回令牌');
        return;
      }

      const pass = await loginByToken(loginToken as Api.Auth.LoginToken);

      if (pass) {
        // Check if the tab needs to be cleared
        const isClear = checkTabClear();
        let needRedirect = redirect;

        if (isClear) {
          needRedirect = false;
        }
        await redirectFromLogin(needRedirect);
      }
    } catch (error: any) {
      resetStore();
      const errStr = String(error?.message || error || '');
      if (errStr.includes('Network Error') || errStr.includes('ECONNREFUSED') || errStr.includes('Failed to fetch')) {
        window.$message?.error('无法连接到后端服务器 (127.0.0.1:8080)，请在终端运行 pnpm dev 启动后端！');
      }
    } finally {
      endLoading();
    }

    return Promise.resolve();
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken) {
    // 1. stored in the localStorage, the later requests need it in headers
    localStg.set('token', loginToken.access_token!);
    localStg.set('refreshToken', loginToken.refresh_token!);

    // 2. get user info
    const pass = await getUserInfo();

    if (pass) {
      token.value = loginToken.access_token!;

      return true;
    }

    return false;
  }

  async function getUserInfo() {
    try {
      const { data: info } = await fetchUserGetInfo();
      if (!info) {
        return false;
      }
      // update store
      Object.assign(userInfo, {
        user: info.user,
        roles: info.roles,
        permissions: info.permissions
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async function initUserInfo() {
    const hasToken = getToken();

    if (hasToken) {
      try {
        const pass = await getUserInfo();
        if (!pass) {
          resetStore();
        }
      } catch (error) {
        // 获取用户信息失败，清除认证状态
        resetStore();
      }
    }
  }

  return {
    token,
    userInfo,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    login,
    logout,
    initUserInfo
  };
});
