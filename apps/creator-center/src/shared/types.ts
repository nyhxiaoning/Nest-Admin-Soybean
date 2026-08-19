export interface ApiResult<T> {
  code: number
  message?: string
  result: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  pageNumber: number
  nextPage?: boolean
}

export interface PageQuery {
  pageNumber?: number
  pageSize?: number
}

export interface Product {
  id: string
  name: string
  code: string
  talId?: string
  url?: string
  categoryId?: string
  categoryName?: string
  status?: "PUBLISHED" | "UNPUBLISHED"
  communicationModule?: string
  communicationModuleName?: string
  networkCover?: string
  networkImgUrl?: string
  minIosVersion?: string
  minAndroidVersion?: string
  guideUrls?: string[]
  stepText?: string
  networkTranslations?: string
  guideSteps?: ProductGuideStep[]
  keyNumber?: number
  activeDeviceNumber?: number
  onLineDeviceNumber?: number
  updateTime?: number
}

export interface ProductCategory {
  id: string
  name: string
  code?: string
  url?: string
}

export interface ProductGuideStep {
  stepNo?: number
  stepImgUrl?: string
  stepImgFullUrl?: string
  title?: string
  text?: string
  translations?: string
}

export interface KeyBatch {
  id: string
  type: "OFFICIAL"
  status?: string
  number: number
  activeDeviceNumber: number
  createTime?: number
  generateTime?: number
  jkUrl?: string
  description?: string
  creator?: {
    id?: string
    phone?: string
    email?: string
  }
}

export interface Device {
  id: string
  productId?: string
  productName?: string
  talId?: string
  name?: string
  sn?: string
  active?: boolean
  online?: boolean
  firmwareVersion?: string
  talVersion?: string
  mac?: string
  activeTime?: number
  lastOnlineTime?: number
  lastBindTime?: number
  bindingPhone?: string
  bindingEmail?: string
  ownerId?: string
  keyId?: string
}

export interface Firmware {
  id: string
  productId: string
  version: string
  talVersion?: string
  typeUpdate?: string
  typeUpdateName?: string
  releaseState?: string
  releaseStateName?: string
  releaseRange?: string
  releaseRangeName?: string
  filePath?: string
  fileUrl?: string
  fileName?: string
  fileSha256?: string
  fileSize?: number
  description?: string
  createTime?: number
  updateTime?: number
}

export interface FirmwareDevice {
  id: number
  deviceId?: string
  sn?: string
  version?: string
  updateState?: string
  updateStateName?: string
  createTime?: number
  completeTime?: number
}
