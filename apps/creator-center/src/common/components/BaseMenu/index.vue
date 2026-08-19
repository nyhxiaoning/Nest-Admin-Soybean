<script setup lang="ts">
import type { MenuItem, MenuMode } from '../../../../types/menu'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useAppI18n } from '@@/composables/useI18n'

interface Props {
  mode?: MenuMode
  menus: ReadonlyArray<MenuItem>
  collapse?: boolean
}

const { mode = 'vertical', menus, collapse = false } = defineProps<Props>()

const route = useRoute()
const router = useRouter()
const { t } = useAppI18n()

const activeIndex = computed(() => {
  return (route.name as string) || (route.path as string) || ''
})

const handleSelect = (index: string) => {
  const target = findByIndex(index, menus)
  if (!target) return
  if (target.routeName) {
    router.push({ name: target.routeName })
  } else if (target.path) {
    router.push(target.path)
  }
}

function itemIndex(item: MenuItem): string {
  return item.routeName || item.path || item.key
}

function findByIndex(index: string, list: ReadonlyArray<MenuItem>): MenuItem | undefined {
  for (const i of list) {
    if (itemIndex(i) === index) return i
    if (i.children?.length) {
      const found = findByIndex(index, i.children)
      if (found) return found
    }
  }
  return undefined
}
</script>

<template>
  <el-menu
    :default-active="activeIndex"
    :mode="mode"
    :router="false"
    :collapse="mode === 'vertical' ? collapse : false"
    class="rounded-md bg-white shadow-sm"
  >
    <template v-for="item in menus" :key="item.key">
      <el-sub-menu v-if="item.children && item.children.length" :index="itemIndex(item)">
        <template #title>
          <span>{{ t(item.labelKey) }}</span>
        </template>
        <el-menu-item v-for="sub in item.children" :key="sub.key" :index="itemIndex(sub)" @click="handleSelect(itemIndex(sub))">
          <span>{{ t(sub.labelKey) }}</span>
        </el-menu-item>
      </el-sub-menu>
      <el-menu-item v-else :index="itemIndex(item)" @click="handleSelect(itemIndex(item))">
        <span>{{ t(item.labelKey) }}</span>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<style scoped lang="scss">
.el-menu {
  &.el-menu--horizontal {
    border-bottom: none;
  }
}
</style>
