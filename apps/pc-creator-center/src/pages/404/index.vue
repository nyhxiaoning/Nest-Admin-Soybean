<script setup lang="ts">
/**
 * 404 页面组件
 * 处理页面未找到的情况
 */
import { useRouter } from 'vue-router'
import LanguageSwitcher from '@@/components/LanguageSwitcher/index.vue'
import { useAppI18n } from '@@/composables/useI18n'

/**
 * Constants
 */
const router = useRouter()

/**
 * Hooks
 */
const { t } = useAppI18n()

/**
 * Events
 */
const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="page-404">
    <!-- 语言切换器 -->
    <div class="absolute top-4 right-4 z-10">
      <LanguageSwitcher type="dropdown" size="small" />
    </div>
    
    <div class="container">
      <div class="error-content">
        <div class="error-code">404</div>
        <div class="error-message">
          <h2>{{ t('pages.notFound.title') }}</h2>
          <p>{{ t('pages.notFound.description') }}</p>
        </div>
        <div class="error-actions">
          <el-button type="primary" @click="goHome">
            {{ t('pages.notFound.backHome') }}
          </el-button>
          <el-button @click="goBack">
            {{ t('pages.notFound.goBack') }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-404 {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
}

.container {
  text-align: center;
  padding: 20px;
}

.error-code {
  font-size: 120px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 20px;
  opacity: 0.8;
}

.error-message h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.error-message p {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 30px;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-code {
    font-size: 80px;
  }
  
  .error-message h2 {
    font-size: 20px;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .error-actions .el-button {
    width: 200px;
  }
}
</style>