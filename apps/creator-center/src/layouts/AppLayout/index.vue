<script setup lang="ts">
import BaseMenu from '@@/components/BaseMenu/index.vue'
import LanguageSwitcher from '@@/components/LanguageSwitcher/index.vue'
import MenuConfig from '@@/components/MenuConfig/index.vue'
import { MENU_ITEMS } from '@@/constants/menu'
import { useAppStore } from '@/pinia/modules/app'
import { computed, ref } from 'vue'

const app = useAppStore()
const menuMode = computed(() => app.menuMode)
const menuCollapsed = computed(() => app.menuCollapsed)
const showConfig = ref(false)
const appTitle = import.meta.env.VITE_APP_TITLE

const openConfig = () => (showConfig.value = true)
const closeConfig = () => (showConfig.value = false)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
      <header class="h-14 flex items-center px-4 bg-white shadow">
      <div class="font-semibold text-gray-800">{{ appTitle }}</div>
      <div class="flex-1 ml-6" v-if="menuMode !== 'vertical'">
        <BaseMenu mode="horizontal" :menus="MENU_ITEMS" />
      </div>
      <div class="ml-auto flex items-center gap-3">
        <LanguageSwitcher type="dropdown" size="small" />
        <el-button circle @click="openConfig" title="菜单配置">配</el-button>
      </div>
    </header>

    <div class="flex flex-1">
      <aside v-if="menuMode !== 'horizontal'" class="bg-white shadow-sm" :class="menuCollapsed ? 'w-16' : 'w-56'">
        <BaseMenu mode="vertical" :menus="MENU_ITEMS" :collapse="menuCollapsed" />
      </aside>
      <main class="flex-1 p-6">
        <router-view />
      </main>
    </div>

    <MenuConfig :visible="showConfig" @close="closeConfig" />
  </div>
</template>

<style scoped></style>
