import { defineStore } from "pinia"
const TOKEN_KEY = "bubble_admin_token"
const COMPANY_KEY = "bubble_admin_company"
const MENUS_KEY = "bubble_admin_menus"
const USER_ID_KEY = "bubble_admin_user_id"

export const useUserStore = defineStore("user", {
  state: () => ({
    // 存储验证码
    smscode: "",
    loginUserName: '',// 登录的用户账号信息
    avatar: '',
    token: localStorage.getItem(TOKEN_KEY) || "",
    userId: localStorage.getItem(USER_ID_KEY) || "",
    companyId: localStorage.getItem(COMPANY_KEY) || "",
    menuCodes: readMenuCodes(),
    name: localStorage.getItem("bubble_admin_name") || ""
  }),
  getters: {
    allowedMenus: (state) => state.menuCodes,
    canAccess: (state) => (module?: string) => !module || state.menuCodes.includes(module)
  },
  actions: {
    setLogin(login: {
      token: string
      id?: string
      name?: string
      phone?: string
      email?: string
      companyId?: string
      menuCodes?: string[]
    }) {
      this.token = login.token
      this.userId = login.id || ""
      this.name = login.name || ""
      this.companyId = login.companyId || ""
      this.menuCodes = login.menuCodes || []
      localStorage.setItem(TOKEN_KEY, this.token)
      localStorage.setItem(USER_ID_KEY, this.userId)
      localStorage.setItem("bubble_admin_name", this.name)
      localStorage.setItem(COMPANY_KEY, this.companyId)
      localStorage.setItem(MENUS_KEY, JSON.stringify(this.menuCodes))
    },
    setUserInfo(info: { id?: string; name?: string; username?: string }) {
      if (info.id !== undefined) this.userId = info.id
      if (info.name !== undefined) this.name = info.name
      if (info.username !== undefined) this.name = info.username
      if (info.id !== undefined) localStorage.setItem(USER_ID_KEY, this.userId)
      if (info.name !== undefined || info.username !== undefined) localStorage.setItem("bubble_admin_name", this.name)
    },
    setToken(token: string) {
      this.token = token
      localStorage.setItem(TOKEN_KEY, token)
    },
    setSmscode(smscode: string) {
      this.smscode = smscode;
    },
    // 设置用户名 
    setLoginUserName(loginUserName: string) {
      this.loginUserName = loginUserName;
    },
    setAvatar(avatar: string) {
      this.avatar = avatar;
    },
    logout() {
      this.token = ""
      this.userId = ""
      this.name = ""
      this.avatar = ""
      this.loginUserName = ""
      this.companyId = ""
      this.menuCodes = []
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_ID_KEY)
      localStorage.removeItem("bubble_admin_name")
      localStorage.removeItem(COMPANY_KEY)
      localStorage.removeItem(MENUS_KEY)
      // 清除预览设备绑定选择
      sessionStorage.removeItem("creator.preview.deviceIds")
    }
  },
  persist: [
    {
      key: 'user-store',
      storage: sessionStorage, // 修改这里
      // paths: ['count'], // 需要持久化指定字段时开启
    },
  ],
})

function readMenuCodes() {
  const value = localStorage.getItem(MENUS_KEY)
  if (!value) return []
  try {
    const menus = JSON.parse(value)
    return Array.isArray(menus) ? menus : []
  } catch {
    return []
  }
}
