<script setup lang="ts">
import { computed, reactive, ref, nextTick } from 'vue';
import type { SelectOption, InputInst } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchAuthGetCaptcha, fetchAuthGetTenantList } from '@/service/api';
import { fetchSocialAuthBinding } from '@/service/api/system';
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
const registerEnabled = ref<boolean>(true);
const remberMe = ref<boolean>(false);
const tenantEnabled = ref<boolean>(false);
const tenantOption = ref<SelectOption[]>([]);

interface PwdLoginForm {
  tenantId: string;
  username: string;
  password: string;
  code?: string;
  uuid?: string;
}

const model: PwdLoginForm = reactive({
  tenantId: '000000',
  username: '',
  password: '',
  code: ''
});

// 系统预设默认测试账号
const defaultAccounts = [
  { label: '管理员', username: 'admin', password: 'admin123', desc: '系统全权管理' },
  { label: '测试员', username: 'test', password: 'admin123', desc: '测试业务功能' },
  { label: '演示员', username: 'demo', password: 'demo123', desc: '演示体验账号' }
];

// 填入指定账户
function handleQuickFill(acc: { username: string; password: string }) {
  model.tenantId = '000000';
  model.username = acc.username;
  model.password = acc.password;
}

// 快速一键登录指定账户
async function handleQuickLogin(acc: { username: string; password: string }) {
  handleQuickFill(acc);

  // 如果启用了验证码且尚未填写，提示用户输入验证码并聚焦
  if (captchaEnabled.value && !model.code) {
    window.$message?.info(`已填入账号【${acc.username}】，请输入验证码后登录`);
    await nextTick();
    codeInputRef.value?.focus();
    return;
  }

  await handleSubmit();
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
    if (!data) {
      return;
    }
    tenantEnabled.value = data.tenantEnabled;
    if (data.tenantEnabled) {
      tenantOption.value = data.voList.map(tenant => {
        return {
          label: tenant.companyName,
          value: tenant.tenantId
        };
      });
    }
  } catch (error) {
    // error handled by request interceptor
  } finally {
    endTenantLoading();
  }
}

handleFetchTenantList();

async function handleSubmit() {
  try {
    await validate();
  } catch (err) {
    return;
  }

  if (remberMe.value) {
    const { tenantId, username, password } = model;
    localStg.set('loginRember', { tenantId, username, password });
  } else {
    localStg.remove('loginRember');
  }

  try {
    await authStore.login({
      tenantId: model.tenantId,
      username: model.username,
      password: model.password,
      code: model.code,
      uuid: model.uuid
    });
  } catch (error) {
    handleFetchCaptchaCode();
  }
}

async function handleFetchCaptchaCode() {
  startCodeLoading();
  try {
    const { data } = await fetchAuthGetCaptcha();
    if (!data) {
      return;
    }
    captchaEnabled.value = data.captchaEnabled;
    if (data.captchaEnabled && data.img) {
      model.uuid = data.uuid;
      if (data.img.startsWith('<svg')) {
        codeUrl.value = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data.img)))}`;
      } else {
        codeUrl.value = `data:image/gif;base64,${data.img}`;
      }
    }
  } catch (error) {
    // error handled by request interceptor
  } finally {
    endCodeLoading();
  }
}

handleFetchCaptchaCode();

function handleLoginRember() {
  const loginRember = localStg.get('loginRember');
  if (!loginRember) return;
  remberMe.value = true;
  Object.assign(model, loginRember);
}

handleLoginRember();

async function handleSocialLogin(type: Api.System.SocialSource) {
  try {
    const { data } = await fetchSocialAuthBinding(type, model.tenantId);
    if (data) {
      window.location.href = data;
    }
  } catch (error) {
    // error handled by request interceptor
  }
}
</script>

<template>
  <div class="login-pwd-module">
    <div class="mb-8px text-28px text-black font-600 dark:text-white">登录账户</div>
    <div class="pb-16px text-14px text-[#858585]">欢迎回来！请输入您的账号和密码</div>

    <!-- 预设默认账号快捷填充面板 -->
    <div class="demo-card mb-20px p-12px rounded-8px border border-primary/20 bg-primary/5">
      <div class="mb-8px flex items-center justify-between text-12px font-600 text-gray-700 dark:text-gray-300">
        <span class="flex items-center gap-4px">
          <icon-carbon-user-avatar class="text-16px text-primary" />
          快捷填入预设账号
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
            <div class="text-12px font-600 text-gray-800 dark:text-gray-100 flex items-center justify-between">
              <span>{{ acc.label }}</span>
            </div>
            <div class="text-11px text-gray-400 truncate">{{ acc.username }}</div>
          </div>
          <div class="mt-8px flex items-center gap-4px">
            <NButton size="tiny" secondary type="primary" class="flex-1" @click.stop="handleQuickFill(acc)">
              填入
            </NButton>
            <NButton size="tiny" type="primary" class="flex-1" :loading="authStore.loginLoading" @click.stop="handleQuickLogin(acc)">
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

.demo-card {
  transition: all 0.2s ease-in-out;
}
</style>
