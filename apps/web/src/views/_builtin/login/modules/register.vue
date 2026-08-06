<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { SelectOption } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchAuthGetCaptcha, fetchAuthGetTenantList, fetchAuthRegister } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'Register'
});

const { toggleLoginModule } = useRouterPush();
const { formRef, validate } = useNaiveForm();
const { loading: codeLoading, startLoading: startCodeLoading, endLoading: endCodeLoading } = useLoading();
const { loading: registerLoading, startLoading: startRegisterLoading, endLoading: endRegisterLoading } = useLoading();

const codeUrl = ref<string>();
const captchaEnabled = ref<boolean>(false);
const tenantEnabled = ref<boolean>(false);
const tenantOption = ref<SelectOption[]>([]);
const agreementChecked = ref<boolean>(true);

const model: Api.Auth.RegisterForm = reactive({
  tenantId: '000000',
  username: '',
  code: '',
  password: '',
  confirmPassword: '',
  userType: 'sys_user'
});

type RuleKey = Extract<keyof Api.Auth.RegisterForm, 'username' | 'password' | 'confirmPassword' | 'code' | 'tenantId'>;

const rules = computed<Record<RuleKey, App.Global.FormRule[]>>(() => {
  const { formRules, createConfirmPwdRule, createRequiredRule } = useFormRules();

  return {
    tenantId: tenantEnabled.value ? formRules.tenantId : [],
    username: [...formRules.userName, { required: true, message: '请输入账号/用户名 (4-16位字母数字)' }],
    password: [...formRules.pwd, { required: true, message: '请输入密码 (6-18位字母数字组合)' }],
    confirmPassword: createConfirmPwdRule(model.password!),
    code: captchaEnabled.value ? [createRequiredRule($t('form.code.required'))] : []
  };
});

async function handleSubmit() {
  if (!agreementChecked.value) {
    window.$message?.warning('请阅读并勾选同意服务协议与隐私政策');
    return;
  }

  try {
    await validate();
  } catch (err) {
    return;
  }

  try {
    startRegisterLoading();
    await fetchAuthRegister({
      tenantId: model.tenantId || '000000',
      username: model.username || '',
      password: model.password || '',
      confirmPassword: model.confirmPassword || '',
      code: model.code || '',
      uuid: model.uuid || '',
      userType: model.userType
    });
    window.$message?.success('账号注册成功，请使用新账号登录！');
    toggleLoginModule('pwd-login');
  } catch (error) {
    handleFetchCaptchaCode();
  } finally {
    endRegisterLoading();
  }
}

async function handleFetchTenantList() {
  try {
    const { data } = await fetchAuthGetTenantList();
    if (!data) {
      return;
    }
    tenantEnabled.value = data.tenantEnabled;
    tenantOption.value = data.voList.map(tenant => {
      return {
        label: tenant.companyName,
        value: tenant.tenantId
      };
    });
  } catch (error) {
    // error handled by request interceptor
  }
}

handleFetchTenantList();

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
</script>

<template>
  <div class="register-module">
    <div class="mb-8px text-28px text-black font-600 dark:text-white">注册新账号</div>
    <div class="pb-16px text-14px text-[#858585]">创建您的个人/企业账号，体验系统的完整功能</div>

    <NForm
      ref="formRef"
      :model="model"
      :rules="rules"
      size="large"
      :show-label="true"
      label-placement="top"
      class="register-form"
      @keyup.enter="() => !registerLoading && handleSubmit()"
    >
      <NFormItem v-if="tenantEnabled" label="归属租户" path="tenantId">
        <NSelect v-model:value="model.tenantId" placeholder="请选择归属租户/公司" :options="tenantOption">
          <template #prefix>
            <icon-carbon-enterprise class="text-18px text-gray-400" />
          </template>
        </NSelect>
      </NFormItem>

      <NFormItem label="注册账号 / 用户名" path="username">
        <NInput
          v-model:value="model.username"
          placeholder="请输入4-16位用户名/账号"
          clearable
        >
          <template #prefix>
            <icon-carbon-user class="text-18px text-gray-400" />
          </template>
        </NInput>
      </NFormItem>

      <NFormItem label="设置登录密码" path="password">
        <NInput
          v-model:value="model.password"
          type="password"
          show-password-on="click"
          placeholder="请输入6-18位密码 (需包含字母和数字)"
          clearable
        >
          <template #prefix>
            <icon-carbon-password class="text-18px text-gray-400" />
          </template>
        </NInput>
      </NFormItem>

      <NFormItem label="确认登录密码" path="confirmPassword">
        <NInput
          v-model:value="model.confirmPassword"
          type="password"
          show-password-on="click"
          placeholder="请再次输入相同密码确认"
          clearable
        >
          <template #prefix>
            <icon-carbon-checkmark-outline class="text-18px text-gray-400" />
          </template>
        </NInput>
      </NFormItem>

      <NFormItem v-if="captchaEnabled" label="安全图形验证码" path="code">
        <div class="w-full flex-y-center gap-12px">
          <NInput v-model:value="model.code" placeholder="请输入右侧验证码" clearable>
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

      <div class="mb-16px flex items-center gap-6px text-13px text-gray-500">
        <NCheckbox v-model:checked="agreementChecked" size="medium" />
        <span>{{ $t('page.login.register.agreement') }}</span>
        <NButton text type="primary" size="small">{{ $t('page.login.register.protocol') }}</NButton>
        <span>与</span>
        <NButton text type="primary" size="small">{{ $t('page.login.register.policy') }}</NButton>
      </div>

      <NSpace vertical :size="14" class="w-full">
        <NButton type="primary" size="large" block :loading="registerLoading" @click="handleSubmit">
          确认注册
        </NButton>
      </NSpace>
    </NForm>

    <div class="mt-20px w-full text-center text-14px text-[#858585]">
      已有账号？
      <NButton text type="primary" class="font-600" @click="toggleLoginModule('pwd-login')">
        {{ $t('common.login') }}
      </NButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
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
</style>
