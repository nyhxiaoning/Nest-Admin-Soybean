<script lang="ts" src="./admin-layout.ts"></script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <img
          class="brand-logo"
          src="https://storage.qajeejio.com/luanzong/creatorhub/login/logo.png"
          alt="冒泡设备管理平台"
        />
        <span>{{ $t('common.pxm_login_title') }}</span>
      </div>

      <div class="sidebar-menu">
        <template v-for="item in menu" :key="isMenuGroup(item) ? item.title : item.path">
          <div
            v-if="isMenuGroup(item)"
            class="sidebar-group"
            :class="{ active: isGroupActive(item) }"
          >
            <button
              class="sidebar-group-title"
              type="button"
              :aria-expanded="isGroupExpanded(item)"
              @click="toggleGroup(item)"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ $t(item.title) }}</span>
              <span class="sidebar-group-arrow" :class="{ expanded: isGroupExpanded(item) }" />
            </button>
            <div v-show="isGroupExpanded(item)" class="sidebar-group-children">
              <router-link
                v-for="child in item.children"
                :key="child.path"
                class="sidebar-link sidebar-link--child"
                :class="{ active: isActive(child) }"
                :to="child.path"
              >
                <span>{{ $t(child.title) }}</span>
              </router-link>
            </div>
          </div>
          <router-link
            v-else
            class="sidebar-link"
            :class="{ active: isActive(item) }"
            :to="item.path"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ $t(item.title) }}</span>
          </router-link>
        </template>
      </div>

      <div class="sidebar-footer">
        <el-dropdown @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :src="userAvartar" :size="32" />
            <span class="user-name">{{ userName || 'Admin' }}</span>
            <el-icon class="user-arrow">
              <ArrowDown />
            </el-icon>
          </div>
          <template #dropdown>
            <!-- 上部：用户信息区域 -->
            <div class="account-menu">
              <!-- 上部：用户信息区域 -->
              <div class="menu-profile">
                <span class="avatar avatar-large">
                  <el-avatar :size="56" :src="userAvartar" />
                </span>
                <strong class="username">{{ userName }}</strong>
                <span class="user-email">{{ userLoginUserName }}</span>
              </div>

              <div class="menu-separator" />

              <!-- 语言切换 -->
              <div class="menu-item" @click="handleChangeLang">
                <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6.8" stroke="currentColor" stroke-width="1.5" />
                  <path
                    d="M2.7 9h12.6M9 2.2c1.8 1.8 2.6 4.1 2.6 6.8s-.8 5-2.6 6.8C7.2 14 6.4 11.7 6.4 9S7.2 4 9 2.2Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
                <span class="menu-label">{{ $t('common.pxm_account_language') }}</span>
                <span class="menu-language">{{ $t('common.pxm_account_language_switch_zh') }}</span>
              </div>

              <div class="menu-separator" />

              <!-- 退出登录 -->
              <div class="menu-item" @click="handleLogout">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                <span class="menu-label">{{ $t('common.pxm_account_logout') }}</span>
              </div>
            </div>
          </template>
        </el-dropdown>
      </div>
    </aside>

    <section class="admin-main">
      <header class="admin-header">
        <div />
        <div class="header-right" />
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<style src="./admin-layout.scss" lang="scss"></style>
