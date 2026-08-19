import { request } from "@/http/request"

export interface LoginRequest {
  username: string
  loginType: "CODE" | "PASSWORD"
  password?: string
  code?: string
}

export interface LoginResult {
  token: string
  id?: string
  name?: string
  phone?: string
  email?: string
  companyId?: string
  menuCodes?: string[]
}

export function loginApi(data: LoginRequest) {
  return request<LoginResult>({
    url: "/user/login/admin",
    method: "post",
    data
  })
}

export function sendLoginCodeApi(account: any) {
  const isEmail = account?.includes("@")
  return request<void>({
    url: "/creator/auth/code",
    method: "post",
    data: {
      email: isEmail ? account : undefined,
      phone: isEmail ? undefined : account,
      // verifyType: isEmail ? 2 : 1,// PHONE EMAIL,这两个字符串
      // codeType: 0
      accountType: isEmail ? 'EMAIL' : 'PHONE'
    }
  })
}



export function authLoginIn(account: any) {
  const isEmail = account?.username?.includes("@")
  return request<void>({
    url: "/creator/auth/login",
    method: "post",
    data: {
      accountType: isEmail ? 'EMAIL' : 'PHONE',
      loginType: account?.code ? "CODE" : "PASSWORD",// PASSWORD CODE
      email: isEmail ? account?.username : undefined,
      password: account?.password,
      code: account?.code,
      phone: isEmail ? undefined : account?.username,
      // verifyType: isEmail ? 2 : 1,
      // codeType: 0
    }
  })
}

export function sendLoginOut(token: string) {
  return request<void>({
    url: "/creator/auth/logout",
    method: "post",
    data: {
      token: token
    }
  })
}

