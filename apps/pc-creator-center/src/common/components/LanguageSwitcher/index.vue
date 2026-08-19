<script setup lang="ts">
/**
 * 语言切换组件
 * 提供多语言切换功能
 */
import { defineProps, defineEmits } from 'vue'
import { getLocale, setLocale, getLocaleDisplayName, SUPPORT_LOCALES } from '@/locales'
import type { SupportLocale } from '@/locales'

/**
 * Props
 */
const props = defineProps<{
  size?: 'large' | 'default' | 'small'
  type?: 'dropdown' | 'button'
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  change: [locale: SupportLocale] // 语言切换事件
}>()

/**
 * States
 */
const currentLocale = ref(getLocale())

/**
 * Functions
 */
const handleLocaleChange = (locale: SupportLocale) => {
  setLocale(locale)
  currentLocale.value = locale
  emit('change', locale)
  
  // 刷新页面以应用新语言（可选）
  // window.location.reload()
}

/**
 * Computed
 */
const currentDisplayName = computed(() => getLocaleDisplayName(currentLocale.value))

const localeOptions = computed(() => 
  SUPPORT_LOCALES.map(locale => ({
    value: locale,
    label: getLocaleDisplayName(locale)
  }))
)
</script>

<template>
  <div class="language-switcher">
    <!-- 下拉菜单模式 -->
    <el-dropdown 
      v-if="props.type === 'dropdown'" 
      @command="handleLocaleChange"
      trigger="click"
    >
      <el-button :size="props.size" class="language-btn">
        <el-icon class="mr-1">
          <Globe />
        </el-icon>
        {{ currentDisplayName }}
        <el-icon class="ml-1">
          <ArrowDown />
        </el-icon>
      </el-button>
      
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item 
            v-for="option in localeOptions"
            :key="option.value"
            :command="option.value"
            :disabled="option.value === currentLocale"
          >
            {{ option.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    
    <!-- 按钮模式 -->
    <div v-else class="language-buttons">
      <el-button-group>
        <el-button
          v-for="option in localeOptions"
          :key="option.value"
          :size="props.size"
          :type="option.value === currentLocale ? 'primary' : 'default'"
          @click="handleLocaleChange(option.value)"
        >
          {{ option.label }}
        </el-button>
      </el-button-group>
    </div>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-block;
}

.language-btn {
  display: flex;
  align-items: center;
}

.language-buttons {
  display: inline-block;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .language-buttons .el-button {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>