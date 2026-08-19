<script setup lang="ts">
import { useAppStore } from '@/pinia/modules/app'
import { computed } from 'vue'

interface Props {
  visible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const app = useAppStore()
const menuMode = computed({ get: () => app.menuMode, set: v => app.setMenuMode(v) })
const menuCollapsed = computed({ get: () => app.menuCollapsed, set: v => app.setMenuCollapsed(v) })

const close = () => emit('close')
</script>

<template>
  <el-drawer :model-value="props.visible" title="菜单配置" size="30%" @close="close">
    <div class="space-y-6">
      <div>
        <div class="mb-2 font-medium">展示模式</div>
        <el-radio-group v-model="menuMode">
          <el-radio-button label="vertical">左侧菜单</el-radio-button>
          <el-radio-button label="horizontal">顶部菜单</el-radio-button>
          <el-radio-button label="mix">混合模式</el-radio-button>
        </el-radio-group>
      </div>
      <div v-if="menuMode !== 'horizontal'">
        <div class="mb-2 font-medium">侧边栏折叠</div>
        <el-switch v-model="menuCollapsed" />
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="close">完成</el-button>
    </template>
  </el-drawer>
</template>

<style scoped></style>

