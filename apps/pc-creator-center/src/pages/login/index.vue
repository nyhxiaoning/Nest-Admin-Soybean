<script setup lang="ts">
/**
 * 登录页面组件
 * 提供用户登录功能
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/pinia/modules/user'
import type { FormInstance, FormRules } from 'element-plus'
import LanguageSwitcher from '@@/components/LanguageSwitcher/index.vue'
import { useAppI18n } from '@@/composables/useI18n'

/**
 * Types
 */
interface LoginForm {
  username: string
  password: string
}

/**
 * Constants
 */
const router = useRouter()
const userStore = useUserStore()

/**
 * States
 */
const loginForm = reactive<LoginForm>({
  username: 'admin',
  password: '123456'
})

const loading = ref(false)
const loginFormRef = ref<FormInstance>()

/**
 * Hooks
 */
const { t } = useAppI18n()

/**
 * Rules
 */
const rules: FormRules<LoginForm> = {
  username: [
    { required: true, message: t('pages.login.usernameRequired'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('pages.login.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('pages.login.passwordMinLength'), trigger: 'blur' }
  ]
}

/**
 * Events
 */
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 模拟登录请求
      setTimeout(() => {
        userStore.setUserInfo({
          id: 1,
          username: loginForm.username,
          email: 'admin@example.com'
        })
        userStore.setToken('mock-token-123456')
        
        ElMessage.success(t('pages.login.loginSuccess'))
        router.push('/')
        loading.value = false
      }, 1000)
    }
  })
}
</script>

<template>
  <div class="page-login">
    <!-- 语言切换器 -->
    <div class="absolute top-4 right-4 z-10">
      <LanguageSwitcher type="dropdown" size="small" />
    </div>
    
    <div class="login-container">
      <div class="login-form">
        <div class="login-header">
          <h2 class="text-2xl font-bold text-center mb-8">{{ t('pages.login.title') }}</h2>
        </div>
        
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="rules"
          size="large"
          @keyup.enter="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              :placeholder="t('pages.login.pleaseInputUsername')"
              prefix-icon="User"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              :placeholder="t('pages.login.pleaseInputPassword')"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          
          <el-form-item>
            <el-button
              type="primary"
              class="w-full"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? t('pages.login.loggingIn') : t('pages.login.loginButton') }}
            </el-button>
          </el-form-item>
        </el-form>
        
        <div class="login-footer text-center text-sm text-gray-500">
          <p>{{ t('pages.login.defaultAccount') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-login {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.login-footer {
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-form {
    padding: 30px 20px;
  }
}
</style>