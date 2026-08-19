# 像素编辑器主题系统说明

## 概述

像素编辑器使用 `data-theme` 属性选择器来控制主题，与原项目保持一致。

## 主题实现

### 1. CSS 变量定义

在 `src/modules/pixel-editor/styles/index.scss` 中定义了两套 CSS 变量：

#### 默认深色主题
```css
:root {
  --pe-bg: #111318;
  --pe-panel: #1b1f28;
  --pe-panel-2: #252b36;
  /* ... 其他深色变量 */
}
```

#### 浅色主题
```css
:root[data-theme="light"] {
  --pe-bg: #f4f6f8;
  --pe-panel: #ffffff;
  --pe-panel-2: #edf1f5;
  /* ... 其他浅色变量 */
}
```

### 2. 主题切换实现

在 `PixelEditor.vue` 中：

```typescript
const THEME_KEY = 'pixelart-web-editor.theme';
const theme = ref<'dark' | 'light'>(
  localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
);

function setTheme(newTheme: 'light' | 'dark'): void {
  theme.value = newTheme;
  applyTheme();
  localStorage.setItem(THEME_KEY, theme.value);
}

function applyTheme(): void {
  // 关键：使用 data-theme 而不是 data-pe-theme
  document.documentElement.dataset.theme = theme.value;
}
```

### 3. 模板中的使用

```vue
<div class="pe-theme-switch" role="group" aria-label="主题模式">
  <button
    type="button"
    :class="{ active: theme === 'dark' }"
    @click="setTheme('dark')"
  >
    深色
  </button>
  <button
    type="button"
    :class="{ active: theme === 'light' }"
    @click="setTheme('light')"
  >
    浅色
  </button>
</div>
```

## 常见问题

### ❌ 错误：浅色主题不生效

**原因**：CSS 选择器使用了 `data-pe-theme="light"` 而不是 `data-theme="light"`

**修复**：
```css
/* 错误 */
:root[data-pe-theme="light"] { ... }

/* 正确 */
:root[data-theme="light"] { ... }
```

### ❌ 错误：主题切换后样式不更新

**原因**：`applyTheme()` 函数设置错了属性名

**修复**：
```typescript
// 错误
document.documentElement.dataset.peTheme = theme.value

// 正确
document.documentElement.dataset.theme = theme.value
```

## 主题变量清单

| 变量名 | 深色值 | 浅色值 | 说明 |
|--------|--------|--------|------|
| `--pe-bg` | `#111318` | `#f4f6f8` | 背景色 |
| `--pe-panel` | `#1b1f28` | `#ffffff` | 面板背景 |
| `--pe-panel-2` | `#252b36` | `#edf1f5` | 次级面板 |
| `--pe-input-bg` | `#11151c` | `#ffffff` | 输入框背景 |
| `--pe-line` | `#343c49` | `#cfd7e2` | 边框/分割线 |
| `--pe-panel-border` | `rgba(255,255,255,.08)` | `rgba(20,30,45,.12)` | 面板边框 |
| `--pe-text` | `#f1f4f8` | `#182230` | 文本颜色 |
| `--pe-muted` | `#a5afbd` | `#637083` | 弱化文本 |
| `--pe-primary` | `#5bd08b` | `#2fb66f` | 主色调 |
| `--pe-primary-dark` | `#35ad68` | `#20965a` | 主色调深色 |
| `--pe-primary-text` | `#06150b` | `#ffffff` | 主色文字 |
| `--pe-active-bg` | `#246741` | `#dff5e8` | 激活背景 |
| `--pe-active-soft` | `rgba(91,208,139,.14)` | `rgba(47,182,111,.16)` | 激活背景柔和 |
| `--pe-danger` | `#ff6a7f` | `#d83452` | 危险色 |
| `--pe-danger-text` | `#ff9cab` | `#b4233f` | 危险文字 |
| `--pe-danger-border` | `rgba(255,106,127,.55)` | `rgba(216,52,82,.5)` | 危险边框 |
| `--pe-blue` | `#64a8ff` | `#236fd6` | 蓝色强调 |
| `--pe-canvas-bg` | `#030509` | `#05070b` | 画布背景 |
| `--pe-brand-mark-bg` | `#0b0f15` | `#e8edf4` | 品牌图标背景 |
| `--pe-button-hover` | `#596576` | `#95a3b5` | 按钮悬停 |
| `--pe-shadow` | `0 18px 40px rgba(0,0,0,.22)` | `0 14px 34px rgba(30,42,60,.12)` | 阴影 |
| `--pe-modal-backdrop` | `rgba(4,6,10,.72)` | `rgba(16,24,38,.42)` | 模态背景 |

## 主题持久化

主题偏好存储在 `localStorage` 中，键名为 `pixelart-web-editor.theme`，值为 `'dark'` 或 `'light'`。

应用启动时自动读取并应用上次保存的主题。
