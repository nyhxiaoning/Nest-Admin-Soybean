<template>
  <main class="no-permission-page">
    <section class="no-permission-card">
      <h1>暂无菜单权限</h1>
      <p>请联系管理员配置后台菜单权限。</p>
      <el-button type="primary" @click="handleLogout"> 重新登录 </el-button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

function handleLogout() {
  userStore.logout()
  router.replace('/login')
}
</script>

<style scoped lang="scss">
.no-permission-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f6fb;
}

.no-permission-card {
  width: 360px;
  padding: 36px;
  border: 1px solid #e4e9f2;
  border-radius: 8px;
  background: #fff;
  text-align: center;

  h1 {
    margin: 0 0 12px;
    color: #1f2d3d;
    font-size: 22px;
  }

  p {
    margin: 0 0 24px;
    color: #738196;
  }
}
</style>
