<template>
  <div class="pe-theme-switch" role="radiogroup" aria-label="主题模式">
    <button
      type="button"
      role="radio"
      :aria-checked="theme === 'dark'"
      :aria-label="theme === 'dark' ? '深色主题（已启用）' : '深色主题'"
      :class="{ active: theme === 'dark' }"
      @click="setTheme('dark')"
    >
      <svg class="pe-theme-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
      <span class="pe-theme-label">{{$t('common.pxm_editor_theme_dark')}}</span>
    </button>
    <button
      type="button"
      role="radio"
      :aria-checked="theme === 'light'"
      :aria-label="theme === 'light' ? '浅色主题（已启用）' : '浅色主题'"
      :class="{ active: theme === 'light' }"
      @click="setTheme('light')"
    >
      <svg class="pe-theme-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
          clip-rule="evenodd"
        />
      </svg>
      <span class="pe-theme-label">{{$t('common.pxm_editor_theme_light')}}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const THEME_KEY = 'pixelart-web-editor.theme'

const theme = ref<'dark' | 'light'>(getStoredTheme())

function getStoredTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

function setTheme(newTheme: 'light' | 'dark'): void {
  if (theme.value === newTheme) return
  theme.value = newTheme
  applyTheme()
  localStorage.setItem(THEME_KEY, theme.value)
}

function applyTheme(): void {
  const host = getThemeHost()
  if (host) host.dataset.theme = theme.value
}

function getThemeHost(): HTMLElement | null {
  return document.querySelector('.pe-theme-host') as HTMLElement | null
}

// Initialize theme on mount
onMounted(() => {
  applyTheme()
})
</script>

<style scoped>
.pe-theme-switch {
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--pe-line, #343c49);
  border-radius: 8px;
  background: var(--pe-panel, #1b1f28);
}

.pe-theme-switch button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 54px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--pe-muted, #a5afbd);
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.pe-theme-switch button:hover {
  color: var(--pe-text, #f1f4f8);
}

.pe-theme-switch button:focus-visible {
  outline: 2px solid var(--pe-primary, #5bd08b);
  outline-offset: 2px;
}

.pe-theme-switch button.active {
  background: var(--pe-primary, #5bd08b);
  color: var(--pe-primary-text, #06150b);
  border-color: var(--pe-primary, #5bd08b);
}

.pe-theme-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.pe-theme-label {
  line-height: 1;
}

@media (max-width: 480px) {
  .pe-theme-switch button {
    padding: 6px 8px;
    font-size: 12px;
    min-width: 48px;
  }

  .pe-theme-icon {
    width: 12px;
    height: 12px;
  }
}
</style>
