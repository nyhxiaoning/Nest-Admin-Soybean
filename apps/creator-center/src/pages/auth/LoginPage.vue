<template>
  <main class="login-page">
    <!-- 左侧插画区 -->
    <div class="login-visual">
      <div class="login-visual__inner">
        <img
          class="login-visual__img"
          src="https://devstorage.jeejio.com/temphenry/image/login-illustration.png.jpeg"
          alt=""
        />
        <!-- <div class="login-visual__overlay">
          <span class="login-visual__mark">G</span>
          <h2 class="login-visual__title">冒泡设备管理平台</h2>
          <p class="login-visual__subtitle">高效管理您的智能设备</p>
        </div> -->
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="login-form-section">
      <div class="login-form-card">
        <div class="login-brand-title">
          <img width="40" src="https://storage.qajeejio.com/luanzong/creatorhub/login/logo.png" />
          <h1 class="login-form-card__title">
            {{ $t('common.pxm_login_title') }}
          </h1>
        </div>

        <el-segmented
          v-model="loginType"
          :options="[
            { label: $t('common.pxm_login_code_tab'), value: 'CODE' },
            { label: $t('common.pxm_login_password_tab'), value: 'PASSWORD' },
          ]"
          class="login-tabs"
        />
        <el-form ref="formRef" :model="form" :rules="getRules" @keyup.enter="handleLogin">
          <el-form-item prop="username" :label="fieldLabel">
            <el-input
              v-model="form.username"
              :prefix-icon="User"
              :placeholder="fieldPlaceholder"
              size="large"
            />
          </el-form-item>
          <el-form-item v-if="loginType === 'CODE'" prop="code" :label="secondLabel">
            <el-input
              v-model="form.code"
              :prefix-icon="ChatDotRound"
              :placeholder="secondPlaceholder"
              size="large"
            >
              <template #append>
                <el-button :disabled="codeButtonDisabled" :loading="sendingCode" @click="sendCode">
                  {{ codeButtonText }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item v-else prop="password" :label="secondLabel">
            <el-input
              v-model="form.password"
              :prefix-icon="Lock"
              :placeholder="secondPlaceholder"
              show-password
              size="large"
              type="password"
            />
          </el-form-item>
          <el-button
            :loading="submitting"
            class="login-button"
            size="large"
            type="primary"
            @click="handleLogin"
          >
            {{ $t('common.pxm_login_submit') }}
          </el-button>
        </el-form>
      </div>

      <!-- 底部版权 + 语言切换 -->
      <div class="login-card-footer">
        <span class="login-card-footer__copyright">
          {{ $t('common.pxm_login_copyright') }}
        </span>
        <el-select
          :model-value="currentLocale"
          :options="localeOptions"
          size="small"
          class="login-card-footer__lang-select"
          @change="handleLocaleChange"
        />
      </div>
    </div>
  </main>
</template>

<script lang="ts" src="./login.ts"></script>
<style scoped lang="scss" src="./login.scss"></style>
