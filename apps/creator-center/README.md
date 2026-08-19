# Vue 3 Admin Template

## 记录

登录页默认语言：浏览器语言为中文时使用中文，否则使用英文。

- 默认语言，使用浏览器语言
- 初始化登录的时候，

1. 翻译键已全部定义：pxm_editor_* 系列键
2. 使用方式简单：$t('pxm_editor_brush') 或 t('pxm_editor_brush')
3. 自动语言切换：调用 switchLocale() 即可
4. 支持中英文：已经配置了 zh-CN 和 en-US

如果你还需要其他 i18n 能力（切换语言、获取当前 locale 等），可以一并解构：

const { t, changeLocale, switchLocale, getCurrentLocale, formatDate } = useAppI18n()

### 注意：js或ts中，解构出来t
// 解构出 t 函数
const { t } = useAppI18n()

### Vue模版中使用全局注入的$t

注意生效的原因：
1. $t 是全局注入的，只在 Vue 组件实例上可用

// i18n 配置
globalInjection: true   // ← 把 $t 注入到所有 Vue 组件实例上

globalInjection: true 会让 Vue 在每个组件实例（即 Vue app 上下文）上挂载 $t、$i18n 等属性。它本质上是组件实例的属性，不是全局变量。

      setLocale(locale as any)



基于 Vue 3 + TypeScript + Element Plus + TailwindCSS 的现代化前端开发模板。

## 技术栈

- **框架**: Vue 3.5+ (Composition API)
- **构建工具**: Vite 6+
- **语言**: TypeScript
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **CSS 框架**: TailwindCSS 3.0
- **CSS 预处理器**: Sass/SCSS
- **国际化**: Vue I18n 9+
- **代码规范**: ESLint + Prettier
- **包管理器**: pnpm
- **网络请求**: Axios

## 项目特性

- ⚡ **快速开发**: 基于 Vite 构建，开发体验极佳
- 🎨 **现代设计**: Element Plus + TailwindCSS 双重加持
- 🔧 **类型安全**: TypeScript 提供完整的类型支持
- 📱 **响应式设计**: 支持移动端适配
- 🌍 **国际化**: 支持多语言切换 (中文/英文)
- 🌙 **主题切换**: 支持明暗主题切换
- 📦 **组件化**: 高度组件化的开发模式
- 🔐 **权限管理**: 完整的权限控制方案
- 🚀 **性能优化**: 代码分割、懒加载等优化策略

## 快速开始

### 环境要求

- Node.js >= 16
- pnpm >= 7

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 代码检查

```bash
pnpm lint
```

### 代码格式化

```bash
pnpm format
```

## 国际化 (i18n)

项目内置了完整的国际化支持，默认支持中文和英文两种语言。

### 使用方法

#### 在组件中使用翻译

```vue
<script setup lang="ts">
// 使用组合式 API
import { useAppI18n } from '@@/composables/useI18n'
const { t } = useAppI18n()
</script>

<template>
  <div>
    <!-- 基础翻译 -->
    <h1>{{ t('pages.home.title') }}</h1>
    
    <!-- 带参数的翻译 -->
    <p>{{ t('common.total') }} {{ count }} {{ t('common.items') }}</p>
  </div>
</template>
```

#### 语言切换

```vue
<script setup lang="ts">
import LanguageSwitcher from '@@/components/LanguageSwitcher/index.vue'
</script>

<template>
  <!-- 下拉菜单模式 -->
  <LanguageSwitcher type="dropdown" size="small" />
  
  <!-- 按钮组模式 -->
  <LanguageSwitcher type="button" size="default" />
</template>
```

#### 编程式语言切换

```typescript
import { setLocale, getLocale, toggleLocale } from '@/locales'

// 设置语言
setLocale('en-US')

// 获取当前语言
const currentLang = getLocale()

// 切换语言
toggleLocale()
```

### 添加新语言

1. 在 `src/locales/` 目录下创建新的语言文件夹
2. 复制现有语言包结构
3. 在 `src/locales/index.ts` 中注册新语言
4. 更新 `SUPPORT_LOCALES` 常量

### 语言包结构

```
src/locales/
├── index.ts          # 国际化配置入口
├── zh-CN/           # 中文语言包
│   ├── index.ts
│   ├── common.ts    # 通用词汇
│   ├── pages.ts     # 页面相关
│   └── components.ts # 组件相关
└── en-US/           # 英文语言包
    ├── index.ts
    ├── common.ts
    ├── pages.ts
    └── components.ts
```

## 项目结构