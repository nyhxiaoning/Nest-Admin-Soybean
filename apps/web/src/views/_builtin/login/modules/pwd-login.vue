<script setup lang="ts">
import { computed, reactive, ref, nextTick, markRaw } from 'vue';
import type { SelectOption, InputInst } from 'naive-ui';
import {
  NButton,
  NForm,
  NFormItem,
  NSelect,
  NInput,
  NCheckbox,
  NSpin,
  NEmpty,
  NConfigProvider
} from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchAuthGetCaptcha, fetchAuthGetTenantList } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { localStg } from '@/utils/storage';
import { $t } from '@/locales';

defineOptions({
  name: 'PwdLogin'
});

const authStore = useAuthStore();
const { toggleLoginModule } = useRouterPush();
const { formRef, validate } = useNaiveForm();
const { loading: codeLoading, startLoading: startCodeLoading, endLoading: endCodeLoading } = useLoading();
const { loading: tenantLoading, startLoading: startTenantLoading, endLoading: endTenantLoading } = useLoading();

const codeInputRef = ref<InputInst | null>(null);
const codeUrl = ref<string>();
const captchaEnabled = ref<boolean>(false);
const remberMe = ref<boolean>(false);
const tenantEnabled = ref<boolean>(false);
const tenantOption = ref<SelectOption[]>([]);
const quickLoginLoading = reactive<Record<string, boolean>>({});
const autoFilledCode = ref<boolean>(true); // 标记是否已自动填充验证码

interface PwdLoginForm {
  tenantId: string;
  username: string;
  password: string;
  code?: string;
  uuid?: string;
  clientId?: string;
  grantType?: string;
  rememberMe?: boolean;
}

const model = markRaw(reactive<PwdLoginForm>({
  tenantId: '000000',
  username: '',
  password: '',
  code: '',
  clientId: 'pc', // 默认客户端ID
  grantType: 'password', // 默认授权类型
  rememberMe: false // 默认不记住密码
}));

const defaultAccounts = markRaw([
  { label: '管理员', username: 'admin', password: 'admin123', desc: '系统全权管理' },
  { label: '测试员', username: 'test', password: 'admin123', desc: '测试业务功能' },
  { label: '演示员', username: 'demo', password: 'demo123', desc: '演示体验账号' }
]);

function handleQuickFill(acc: { username: string; password: string }) {
  model.tenantId = '000000';
  model.username = acc.username;
  model.password = acc.password;
  // 重置验证码状态
  autoFilledCode.value = false;
  model.code = '';
  nextTick(() => {
    const usernameInput = document.querySelector('.login-form .n-input') as HTMLElement;
    usernameInput?.click();
  });
}

async function handleQuickLogin(acc: { username: string; password: string }) {
  if (quickLoginLoading[acc.username]) return;

  quickLoginLoading[acc.username] = true;
  try {
    handleQuickFill(acc);
    if (captchaEnabled.value && !model.code) {
      window.$message?.info(`已填入账号【${acc.username}】，请输入验证码后登录`);
      await nextTick();
      codeInputRef.value?.focus();
      return;
    }
    await handleSubmit();
  } catch (error) {
    console.error('快捷登录失败:', error);
    window.$message?.error('登录失败，请重试');
  } finally {
    quickLoginLoading[acc.username] = false;
  }
}

type RuleKey = Extract<keyof PwdLoginForm, 'username' | 'password' | 'code' | 'tenantId'>;

const rules = computed<Record<RuleKey, App.Global.FormRule[]>>(() => {
  const { formRules, createRequiredRule } = useFormRules();

  const loginRules: Record<RuleKey, App.Global.FormRule[]> = {
    username: [...formRules.userName, { required: true, message: '请输入账号/用户名' }],
    password: [createRequiredRule('请输入密码')],
    code: captchaEnabled.value ? [createRequiredRule($t('form.code.required'))] : [],
    tenantId: tenantEnabled.value ? formRules.tenantId : []
  };

  return loginRules;
});

async function handleFetchTenantList() {
  startTenantLoading();
  try {
    const { data } = await fetchAuthGetTenantList();
    if (!data) return;
    tenantEnabled.value = data.tenantEnabled;
    if (data.tenantEnabled) {
      tenantOption.value = data.voList.map(tenant => ({
        label: tenant.companyName,
        value: tenant.tenantId
      }));
    }
  } catch {
    // error handled by request interceptor
  } finally {
    endTenantLoading();
  }
}

handleFetchTenantList();

async function handleSubmit() {
  // 1. 表单校验
  try {
    await validate();
  } catch {
    window.$message?.warning('请填写完整的登录信息');
    return;
  }

  // 2. 记住我
  if (model.rememberMe) {
    const { tenantId, username, password } = model;
    localStg.set('loginRember', { tenantId, username, password });
  } else {
    localStg.remove('loginRember');
  }

  // 3. 调用登录接口
  try {
    await authStore.login({
      tenantId: model.tenantId,
      username: model.username,
      password: model.password,
      code: model.code || undefined,
      uuid: model.uuid || undefined,
      clientId: model.clientId || 'pc', // 默认客户端ID
      grantType: model.grantType || 'password', // 默认授权类型
      rememberMe: model.rememberMe // 记住密码选项
    });
  } catch (error) {
    // 4. 错误分类提示
    const err = error as any;
    const errMsg = err?.message || String(error) || '登录失败，请检查后重试';

    if (errMsg.includes('账号') || errMsg.includes('用户名') || errMsg.includes('user')) {
      window.$message?.error('账号不存在或已被禁用，请检查用户名是否正确');
    } else if (errMsg.includes('密码') || errMsg.includes('password') || errMsg.includes('凭据')) {
      window.$message?.error('密码错误，请检查密码是否正确');
    } else if (errMsg.includes('验证码') || errMsg.includes('code') || errMsg.includes('captcha')) {
      window.$message?.error('验证码错误或已过期，请重新输入验证码');
    } else if (errMsg.includes('租户') || errMsg.includes('tenant')) {
      window.$message?.error('租户选择无效，请确认租户编号是否正确');
    } else if (errMsg.includes('锁定') || errMsg.includes('禁用') || errMsg.includes('locked') || errMsg.includes('disabled')) {
      window.$message?.error('账号已被锁定或禁用，请联系管理员');
    } else if (errMsg.includes('Network Error') || errMsg.includes('ECONNREFUSED') || errMsg.includes('Failed to fetch')) {
      window.$message?.error('无法连接到后端服务器 (127.0.0.1:8080)，请在终端运行 pnpm dev 启动后端！');
    } else {
      window.$message?.error(errMsg);
    }

    // 5. 登录失败后刷新验证码
    handleFetchCaptchaCode();
  }
}

async function handleFetchCaptchaCode() {
  startCodeLoading();
  try {
    const { data } = await fetchAuthGetCaptcha();
    if (!data) return;

    captchaEnabled.value = data.captchaEnabled;

    // 如果开启了验证码，获取新的验证码
    if (data.captchaEnabled && data.img) {
      model.uuid = data.uuid;
      autoFilledCode.value = false; // 重置自动填充状态
      model.code = ''; // 清空验证码输入

      // 处理验证码图片
      if (data.img.startsWith('<svg')) {
        codeUrl.value = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data.img)))}`;
      } else {
        codeUrl.value = `data:image/gif;base64,${data.img}`;
      }

      // 自动聚焦到验证码输入框
      await nextTick();
      codeInputRef.value?.focus();
    }
  } catch (error: any) {
    console.error('获取验证码失败:', error);
    const errMsg = error?.message || String(error) || '';
    if (errMsg.includes('Network Error') || errMsg.includes('ECONNREFUSED')) {
      window.$message?.error('无法连接到服务器，请确保后端服务已启动');
    } else {
      window.$message?.error('获取验证码失败，请刷新重试');
    }
  } finally {
    endCodeLoading();
  }
}

/**
 * 自动填充验证码（如果后端支持返回验证码文本）
 * @param captchaText 验证码文本
 */
function autoFillCaptcha(captchaText: string) {
  if (captchaText && captchaEnabled.value) {
    model.code = captchaText;
    autoFilledCode.value = true;
    window.$message?.success('验证码已自动填充');
  }
}

/**
 * 刷新验证码并自动聚焦
 */
function refreshCaptchaAndFocus() {
  handleFetchCaptchaCode();
}

handleFetchCaptchaCode();

// 全局错误处理器
window.addEventListener('error', (event) => {
  if (event.message?.includes('Maximum call stack size exceeded')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.$message?.error('页面发生错误，请刷新重试');
    return false;
  }
});

function handleLoginRember() {
  const loginRember = localStg.get('loginRember');
  if (!loginRember) return;
  remberMe.value = true;
  Object.assign(model, loginRember);
}

handleLoginRember();
</script>

<template>
  <div class="login-pwd-module">
    <div class="mb-8px text-28px text-black font-600 dark:text-white">{{ $t('page.login.pwdLogin.title') }}</div>
    <div class="pb-16px text-14px text-[#858585]">{{ $t('page.login.pwdLogin.subTitle') }}</div>

    <!-- 预设默认账号快捷填充面板 -->
    <div class="demo-card mb-20px p-12px rounded-8px border border-primary/20 bg-primary/5">
      <div class="mb-8px flex items-center justify-between text-12px font-600 text-gray-700 dark:text-gray-300">
        <span class="flex items-center gap-4px">
          <icon-carbon-user-avatar class="text-16px text-primary" />
          快捷填入预设账号2222
        </span>
        <span class="text-11px text-gray-400 font-normal">默认租户: 000000</span>
      </div>
      <div class="grid grid-cols-3 gap-8px">
        <div
          v-for="acc in defaultAccounts"
          :key="acc.username"
          class="p-8px rounded-6px bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col justify-between hover:border-primary transition-all"
        >
          <div>
            <div class="text-12px font-600 text-gray-800 dark:text-gray-100">
              <span>{{ acc.label }}</span>
            </div>
            <div class="text-11px text-gray-400 truncate">{{ acc.username }}</div>
          </div>
          <div class="mt-8px flex items-center gap-4px">
            <NButton
              size="tiny"
              secondary
              type="primary"
              class="flex-1"
              :loading="quickLoginLoading[acc.username]"
              @click.stop="handleQuickFill(acc)"
            >
              填入
            </NButton>
            <NButton
              size="tiny"
              type="primary"
              class="flex-1"
              :loading="quickLoginLoading[acc.username] || authStore.loginLoading"
              @click.stop="handleQuickLogin(acc)"
            >
              登录
            </NButton>
          </div>
        </div>
      </div>
    </div>

    <NForm
      ref="formRef"
      :model="model"
      :rules="rules"
      size="large"
      :show-label="true"
      label-placement="top"
      class="login-form"
      @keyup.enter="() => !authStore.loginLoading && handleSubmit()"
    >
      <NFormItem v-if="tenantEnabled" label="租户" path="tenantId">
        <NSelect
          v-model:value="model.tenantId"
          placeholder="请选择所属租户"
          :options="tenantOption"
          :loading="tenantLoading"
        >
          <template #prefix>
            <icon-carbon-enterprise class="text-18px text-gray-400" />
          </template>
        </NSelect>
      </NFormItem>

      <NFormItem label="账号 / 用户名" path="username">
        <NInput
          v-model:value="model.username"
          placeholder="请输入用户名/手机号/邮箱"
          clearable
        >
          <template #prefix>
            <icon-carbon-user class="text-18px text-gray-400" />
          </template>
        </NInput>
      </NFormItem>

      <NFormItem label="密码" path="password">
        <NInput
          v-model:value="model.password"
          type="password"
          show-password-on="click"
          placeholder="请输入登录密码"
          clearable
        >
          <template #prefix>
            <icon-carbon-password class="text-18px text-gray-400" />
          </template>
        </NInput>
      </NFormItem>

      <NFormItem v-if="captchaEnabled" label="验证码" path="code">
        <div class="w-full flex-y-center gap-12px">
          <NInput
            ref="codeInputRef"
            v-model:value="model.code"
            placeholder="请输入右侧验证码"
            clearable
          >
            <template #prefix>
              <icon-carbon-security class="text-18px text-gray-400" />
            </template>
          </NInput>
          <NSpin :show="codeLoading" :size="24" class="h-42px">
            <NButton :focusable="false" class="login-code h-42px w-130px" @click="handleFetchCaptchaCode">
              <img v-if="codeUrl" :src="codeUrl" alt="验证码" class="h-full w-full object-cover" />
              <NEmpty v-else description="点击获取" />
            </NButton>
          </NSpin>
        </div>
      </NFormItem>

      <div class="mb-16px flex-y-center justify-between">
        <NCheckbox v-model:checked="remberMe" size="medium">{{ $t('page.login.pwdLogin.rememberMe') }}</NCheckbox>
        <NButton text type="primary" size="small" @click="toggleLoginModule('reset-pwd')">
          {{ $t('page.login.pwdLogin.forgetPassword') }}
        </NButton>
      </div>

      <NSpace vertical :size="12" class="w-full">
        <NButton type="primary" size="large" block :loading="authStore.loginLoading" @click="handleSubmit">
          {{ $t('common.login') }}
        </NButton>
        <NButton size="large" block @click="toggleLoginModule('code-login')">
          {{ $t('page.login.common.useCodeLogin') }}
        </NButton>
      </NSpace>
    </NForm>

    <div class="mt-20px w-full text-center text-14px text-[#858585]">
      还没有账户？
      <NButton text type="primary" class="font-600" @click="toggleLoginModule('register')">
        {{ $t('page.login.common.register') }}
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.login-code {
  &.n-button {
    --n-padding: 0 !important;
    background-color: #f3f4f6;
    overflow: hidden;
  }

  img {
    height: 42px;
    width: 100%;
  }
}

.demo-card {
  transition: all 0.2s ease-in-out;
}

.demo-card:hover {
  border-color: var(--n-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.n-form-item .n-form-item-label) {
  font-weight: 500;
  font-size: 14px;
  padding-bottom: 4px;
}

:deep(.n-base-selection),
:deep(.n-input) {
  --n-height: 42px !important;
  --n-font-size: 15px !important;
  --n-border-radius: 8px !important;
}

:deep(.n-button) {
  --n-height: 42px !important;
  --n-font-size: 16px !important;
  --n-border-radius: 8px !important;
}
</style>
