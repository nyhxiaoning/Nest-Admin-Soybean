/**
 * Vue I18n 类型声明
 */
import type { DefineLocaleMessage, DefineDateTimeFormat, DefineNumberFormat } from 'vue-i18n'

declare module 'vue-i18n' {
  // 定义语言包的类型结构
  export interface DefineLocaleMessage {
    common: {
      confirm: string
      cancel: string
      save: string
      delete: string
      edit: string
      add: string
      search: string
      reset: string
      submit: string
      back: string
      next: string
      previous: string
      close: string
      refresh: string
      loading: string
      success: string
      error: string
      warning: string
      info: string
      required: string
      optional: string
      pleaseSelect: string
      pleaseInput: string
      today: string
      yesterday: string
      tomorrow: string
      thisWeek: string
      thisMonth: string
      thisYear: string
      total: string
      items: string
      page: string
      pageSize: string
      goToPage: string
      operationSuccess: string
      operationFailed: string
      saveSuccess: string
      deleteSuccess: string
      networkError: string
      requestTimeout: string
      serverError: string
      noPermission: string
      loginRequired: string
      language: string
      switchLanguage: string
    }
    pages: {
      home: {
        title: string
        description: string
        getStarted: string
        loginSystem: string
        features: {
          fastDevelopment: {
            title: string
            description: string
          }
          modernDesign: {
            title: string
            description: string
          }
          typeSafety: {
            title: string
            description: string
          }
        }
      }
      login: {
        title: string
        username: string
        password: string
        loginButton: string
        loggingIn: string
        usernameRequired: string
        passwordRequired: string
        passwordMinLength: string
        defaultAccount: string
        loginSuccess: string
        pleaseInputUsername: string
        pleaseInputPassword: string
      }
      notFound: {
        title: string
        description: string
        backHome: string
        goBack: string
      }
    }
    components: {
      languageSwitcher: {
        title: string
        chinese: string
        english: string
      }
      navigation: {
        home: string
        about: string
        contact: string
        profile: string
        settings: string
        logout: string
      }
      table: {
        noData: string
        actions: string
        serialNumber: string
        createTime: string
        updateTime: string
        status: string
      }
      form: {
        validation: {
          required: string
          email: string
          phone: string
          url: string
          number: string
          integer: string
          minLength: string
          maxLength: string
          min: string
          max: string
        }
      }
    }
  }

  export interface DefineDateTimeFormat {}

  export interface DefineNumberFormat {}
}