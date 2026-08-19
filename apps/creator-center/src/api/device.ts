// ==================== 设备相关接口  ====================


import type { PageQuery, PageResult } from "@/shared/types"
import { request } from "@/http/request"


/** 设备在线状态 */
export type DeviceOnlineStatus = "ONLINE" | "OFFLINE"

/** 设备基本信息 */
export interface CreatorDeviceVO {
  id: string
  name: string
  sn?: string
  online: DeviceOnlineStatus
  productId?: string
  productName?: string
  lastOnlineTime?: number
  lastBindTime?: number
  firmwareVersion?: string
}


/** 设备列表分页查询参数 */
export interface CreatorDevicePageRequest extends PageQuery {
  keyword?: string
  online?: DeviceOnlineStatus
}

/** 预览推送请求 */
export interface CreatorPreviewRequest {
  deviceIds: string[]
  type: "STATIC" | "GIF"
  fileUrl: string
  fileSize: number
}

/** 预览推送响应 */
export interface CreatorPreviewResultVO {
  success: boolean
  deviceId: string
  deviceName: string
  message?: string
}

/**
 * 分页查询我的设备列表
 * GET /creator/devices
 */
export function pageDevicesApi(params: CreatorDevicePageRequest) {
  return request<PageResult<CreatorDeviceVO>>({
    url: "/creator/devices",
    method: "get",
    params,
  })
}

/**
 * 查询所有我的设备（不分页）
 * GET /creator/devices?pageNumber=1&pageSize=999
 */
export function listDevicesApi() {
  return request<CreatorDeviceVO[]>({
    url: "/creator/devices",
    method: "get",
    // params: { pageNumber: 1, pageSize: 30 },
  })
}

/**
 * 预览推送资源到设备
 * POST /creator/preview
 */
export function previewToDeviceApi(data: CreatorPreviewRequest) {
  return request<CreatorPreviewResultVO[]>({
    url: "/creator/preview",
    method: "post",
    data,
  })
}

/**
 * 推送资源到指定设备（简版，单个设备）
 * @param deviceId 设备 ID
 * @param type 文件类型
 * @param fileUrl 文件 URL
 * @param fileSize 文件大小
 */
export function sendPreviewToDeviceApi(
  deviceId: string,
  type: "STATIC" | "GIF",
  fileUrl: string,
  fileSize: number
) {
  return request<CreatorPreviewResultVO>({
    url: "/creator/preview",
    method: "post",
    data: {
      deviceIds: [deviceId],
      type,
      fileUrl,
      fileSize,
    },
  })
}