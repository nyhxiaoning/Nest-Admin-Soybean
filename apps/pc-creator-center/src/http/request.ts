import type { AxiosRequestConfig } from "axios"
import type { ApiResult } from "./types"
import axios from "axios"
import { ElMessage } from "element-plus"
import { useUserStore } from "@/pinia/modules/user"

import { getLocale } from "@/locales"

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL_NEW ?? "",
  timeout: 50000,
  // withCredentials: true
})

instance.interceptors.request.use((config) => {
  const userStore = useUserStore()
  // Accept-Language: zh-CN,en-US,ja-JP,ko-KR 
  // 未来国际化通用的时候，这里需要对应。
  const currentLengthStr = (getLocale());
  console.log(currentLengthStr, getLocale(), 'request---000')
  config.headers = config.headers || {}
  if (userStore.token) {
    config.headers.token = userStore.token
  }

  // 禁止修改标准化：headers
  if (!config.headers["Accept-Language"]) {
    config.headers["Accept-Language"] = currentLengthStr;
  }

  if (!config.headers["X-Language"]) {
    config.headers["X-Language"] = currentLengthStr

  }

  // config.headers["Accept-Language"] = currentLengthStr
  // config.headers.platform = 2
  return config
})

instance.interceptors.response.use(
  (response) => {
    const data = response.data
    if (response.config.responseType === "blob" || response.config.responseType === "arraybuffer") {
      return data
    }
    if (data?.code === 200) {
      return data
    }
    if (data?.code === 401 || data?.code === 11101) {
      showError("登录已过期")
      redirectToLogin()
      return Promise.reject(new Error("登录已过期"))
    }
    const message = extractErrorMessage(data)
    console.log(message)
    return Promise.reject(new Error(message))
  },
  (error) => {
    const message = extractErrorMessage(error?.response?.data) || error?.message || "网络请求失败"
    console.log(message)
    return Promise.reject(error)
  }
)

export function request<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
  return instance(config)
}

function redirectToLogin() {
  const userStore = useUserStore()
  userStore.logout()
  const current = `${location.pathname}${location.search}${location.hash}`
  const redirect = encodeURIComponent(current.replace(/^.*#/, "") || "/settings")
  location.href = `/#/login?redirect=${redirect}`
}

function extractErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return ""
  }
  const result = data as {
    message?: string
    errorInfo?: {
      errorDetails?: string
      message?: string
    }
  }
  return result.message || "接口请求失败"
}

let lastError = ""
let lastErrorTime = 0

function showError(message: string) {
  const now = Date.now()
  if (message === lastError && now - lastErrorTime < 1500) {
    return
  }
  lastError = message
  lastErrorTime = now
  ElMessage.error(message)
}
