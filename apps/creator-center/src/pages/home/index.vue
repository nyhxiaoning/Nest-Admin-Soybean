<script setup lang="ts">
/**
 * 首页组件
 * 展示应用程序主要功能和导航
 */
import { reactive } from 'vue'
import LanguageSwitcher from '@@/components/LanguageSwitcher/index.vue'
import { useAppI18n } from '@@/composables/useI18n'

/**
 * Types
 */
interface State {}

/**
 * States
 */
const state: State = reactive({})

/**
 * Hooks
 */
const { t } = useAppI18n()

/**
 * Events
 */
const handleGetStarted = () => {
  ElMessage.success(t('common.operationSuccess'))
}

</script>

<template>
  <div class="page-home">
    <!-- 语言切换器 -->
    <div class="absolute top-4 right-4 z-10">
      <LanguageSwitcher type="dropdown" size="small" />
    </div>
    
    <div class="container mx-auto px-4 py-16">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          {{ t('pages.home.title') }}
        </h1>
        <p class="text-xl text-gray-100 mb-8">
          {{ t('pages.home.description') }}
        </p>
      </div>
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          {{ t('pages.home.title') }}
        </h1>
        
        <div class="space-x-4">
          <el-button type="primary" size="large" @click="handleGetStarted">
            {{ t('pages.home.getStarted') }}
          </el-button>
          <el-button size="large" @click="$router.push('/login')">
            {{ t('pages.home.loginSystem') }}
          </el-button>
        </div>
      </div>
      
      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center p-6 bg-white rounded-lg shadow-md">
          <div class="text-3xl mb-4">⚡</div>
          <h3 class="text-lg font-semibold mb-2">{{ t('pages.home.features.fastDevelopment.title') }}</h3>
          <p class="text-gray-600">{{ t('pages.home.features.fastDevelopment.description') }}</p>
        </div>
        
        <div class="text-center p-6 bg-white rounded-lg shadow-md">
          <div class="text-3xl mb-4">🎨</div>
          <h3 class="text-lg font-semibold mb-2">{{ t('pages.home.features.modernDesign.title') }}</h3>
          <p class="text-gray-600">{{ t('pages.home.features.modernDesign.description') }}</p>
        </div>
        
        <div class="text-center p-6 bg-white rounded-lg shadow-md">
          <div class="text-3xl mb-4">🔧</div>
          <h3 class="text-lg font-semibold mb-2">{{ t('pages.home.features.typeSafety.title') }}</h3>
          <p class="text-gray-600">{{ t('pages.home.features.typeSafety.description') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
}

.page-home .container {
  padding-top: 10vh;
}

.page-home h1 {
  color: white;
}

.page-home p {
  color: rgba(255, 255, 255, 0.9);
}
</style>
