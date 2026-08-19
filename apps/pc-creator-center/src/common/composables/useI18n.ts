/**
 * 国际化组合式函数
 * 提供便捷的国际化功能
 */
import { useI18n as useVueI18n } from 'vue-i18n'
import { getLocale, setLocale, toggleLocale, getLocaleDisplayName } from '@/locales'
import type { SupportLocale } from '@/locales'

export const useAppI18n = () => {
  const { t, locale, availableLocales } = useVueI18n()

  /**
   * 翻译函数（带类型提示）
   */
  const translate = (key: string, params?: Record<string, any>) => {
    return t(key, params)
  }

  /**
   * 获取当前语言
   */
  const getCurrentLocale = (): SupportLocale => {
    return getLocale()
  }

  /**
   * 设置语言
   */
  const changeLocale = (newLocale: SupportLocale) => {
    setLocale(newLocale)
  }

  /**
   * 切换语言
   */
  const switchLocale = () => {
    toggleLocale()
  }

  /**
   * 获取语言显示名称
   */
  const getDisplayName = (locale: SupportLocale) => {
    return getLocaleDisplayName(locale)
  }

  /**
   * 检查是否为当前语言
   */
  const isCurrentLocale = (targetLocale: SupportLocale) => {
    return getCurrentLocale() === targetLocale
  }

  /**
   * 格式化日期（根据当前语言）
   */
  const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
    const dateObj = new Date(date)
    const currentLocale = getCurrentLocale()

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    }

    return new Intl.DateTimeFormat(currentLocale, defaultOptions).format(dateObj)
  }

  /**
   * 格式化数字（根据当前语言）
   */
  const formatNumber = (number: number, options?: Intl.NumberFormatOptions) => {
    const currentLocale = getCurrentLocale()
    return new Intl.NumberFormat(currentLocale, options).format(number)
  }

  /**
   * 格式化货币（根据当前语言）
   */
  const formatCurrency = (amount: number, currency = 'CNY') => {
    const currentLocale = getCurrentLocale()
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency
    }).format(amount)
  }

  return {
    t: translate,
    locale,
    availableLocales,
    getCurrentLocale,
    changeLocale,
    switchLocale,
    getDisplayName,
    isCurrentLocale,
    formatDate,
    formatNumber,
    formatCurrency
  }
}

export default useAppI18n