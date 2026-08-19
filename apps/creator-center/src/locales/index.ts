/**
 * 国际化配置入口文件
 * 负责初始化 Vue I18n 实例和语言配置
 */
import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

// 支持的语言列表
export const SUPPORT_LOCALES = ['zh-CN', 'en-US'] as const
export type SupportLocale = typeof SUPPORT_LOCALES[number]

// 默认语言
export const DEFAULT_LOCALE: SupportLocale = 'zh-CN'

// 语言包
const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
}

// 从本地存储获取语言设置
const getStoredLocale = (): SupportLocale => {
  const stored = localStorage.getItem('locale') as SupportLocale
  return SUPPORT_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE
}

// 从浏览器获取语言设置
const getBrowserLocale = (): SupportLocale => {
  const browserLang = navigator.language

  // 精确匹配
  if (SUPPORT_LOCALES.includes(browserLang as SupportLocale)) {
    return browserLang as SupportLocale
  }

  // 语言前缀匹配
  const langPrefix = browserLang.split('-')[0]
  const matchedLocale = SUPPORT_LOCALES.find(locale =>
    locale.startsWith(langPrefix)
  )

  return matchedLocale || DEFAULT_LOCALE
}

// 获取初始语言
const getInitialLocale = (): SupportLocale => {
  return getStoredLocale() || getBrowserLocale()
}

// 创建 i18n 实例
const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: getInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  globalInjection: true, // 全局注入 $t 函数
  silentTranslationWarn: true, // 静默翻译警告
  silentFallbackWarn: true // 静默回退警告
})

// 设置语言
export const setLocale = (locale: SupportLocale) => {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
  document.documentElement.lang = locale
}

// 获取当前语言
export const getLocale = (): SupportLocale => {
  return i18n.global.locale.value as SupportLocale
}

// 切换语言
export const toggleLocale = () => {
  const currentLocale = getLocale()
  console.log(currentLocale, 'currentLocale')
  const newLocale = currentLocale === 'zh-CN' ? 'en-US' : 'zh-CN'
  setLocale(newLocale)
}

// 获取语言显示名称
export const getLocaleDisplayName = (locale: SupportLocale): string => {
  const displayNames: Record<SupportLocale, string> = {
    'zh-CN': '简体中文',
    'en-US': 'English'
  }
  return displayNames[locale]
}

export default i18n