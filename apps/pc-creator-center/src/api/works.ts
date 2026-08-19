// ==================== CreatorHub 作品保存、分页、详情和删除 整个 works 作品进行增删查改的控制 ====================


import type { PageQuery, PageResult } from "@/shared/types"
import { request } from "@/http/request"


/** 作品保存请求体 */
export interface CreatorWorkSaveRequest {
  id?: string
  title: string
  type?: string
  coverUrl?: string
  gifFileUrl?: string
  gifFileSize?: number
  editableFileUrl?: string
  binFileUrl?: string
  binFileSize?: number
  width?: number
  height?: number
  frameCount?: number
  frameDelay?: number
  preview?: string
  publishStatus?: "REJECTED" | "OFFLINE" |  "REVIEWING" | "PUBLISHED",
  remark?: string
}

/** 作品分页查询参数 */
export interface CreatorWorkPageRequest extends PageQuery {
  keyword?: string
  sortBy?: "CREATED_AT" | "LAST_VIEW_TIME" | "TITLE"
  direction?: "ASC" | "DESC"
}

/** 作品发布审核提交请求 */
export interface WorkSubmitRequest {
  remark?: string
}

/** 作品上传凭证请求 这个对应eidtorfile，这个还没有使用
 * 传入不同role即可，
 * COVER_IMAGE
 * GIF_FILE
 * GIF_FILE
 * STATIC_BIN
 */
export interface CreatorUploadTokenRequest {
  role: "COVER_IMAGE" | "GIF_FILE" | "GIF_FILE" | "STATIC_BIN"
  fileName?: string
  fileSize?: number
  fileType?: string
}

/** OSS 上传凭证响应 */
export interface OSSTokenVO {
  token: string
  uploadUrl: string
  fileKey: string
  expireTime?: number
}

/** 作品基本信息 */
export interface CreatorWorkVO {
  id: string
  title: string
  type?: string
  coverUrl?: string
  gifFileUrl?: string
  gifFileSize?: number
  editableFileUrl?: string
  binFileUrl?: string
  binFileSize?: number
  width?: number
  height?: number
  frameCount?: number
  frameDelay?: number
  preview?: string
  publishStatus: "REJECTED" | "OFFLINE" |  "REVIEWING" | "PUBLISHED",
  status?:   "REJECTED" | "OFFLINE" |  "REVIEWING" | "PUBLISHED",
  workVersion?: string
  contentConsistent?: boolean
  submittedTime?: number
  remark?: string
  rejectedReason?: string
  lastViewTime?: number
  createTime?: number
  updateTime?: number
  creatorId?: string
  creatorName?: string
}

/** 发布审核管理条目 */
export interface CreatorReleaseManagementVO {
  publishedCount: number
  reviewingCount: number
  applicableCount: number
  page: {
    total: number
    list: CreatorWorkVO[]
    pageNumber: number
    nextPage: boolean
  }
}

/** 发布审核分页查询参数 */
export interface CreatorReleasePageRequest extends PageQuery {
  keyword?: string
  status?: "REJECTED" | "OFFLINE" |  "REVIEWING" | "PUBLISHED",
}

/** 审核工作条目 */
export interface CreatorAuditWorkVO {
  id: string
  title: string
  coverUrl?: string
  publishStatus: string
  createTime?: number
  creatorName?: string
  remark?: string
  rejectedReason?: string
}

/** 审核工作分页参数 */
export interface CreatorAuditPageRequest extends PageQuery {
  status?: string
  keyword?: string
  apiKey?: string
  timestamp?: number
  nonce?: string
  sign?: string
}

/** 审核操作请求 */
export interface CreatorAuditRequest {
  workId: string
  decision: "APPROVE" | "REJECT"
  reason?: string
  auditorId?: string
  apiKey?: string
  timestamp?: number
  nonce?: string
  sign?: string
}


/** ***********************TODO: CreatorHub 作品保存、分页、详情和删除。************ */

/**
 * 分页查询我的作品
 * GET /api/creator/works
 */
export function pageWorksApi(params: CreatorWorkPageRequest) {
  return request<PageResult<CreatorWorkVO>>({
    url: "/creator/works",
    method: "get",
    params,
  })
}


/**
 * 查询作品的发布标签
 */
export interface WorkTagVO {
  id: string
  name: string
  tagCode: string
}

export function pageTagWorksApi() {
  return request<{ result: WorkTagVO[] }>({
    url: "/creator/work-tags",
    method: "get",
  })
}

/**
 * 查询作品详情
 * GET /api/creator/works/{id}
 */
export function getWorkDetailApi(id: string) {
  return request<CreatorWorkVO>({
    url: `/creator/works/${id}`,
    method: "get",
  })
}

/**
 * 创建作品
 * POST /api/creator/works
 */
export function createWorkApi(data: CreatorWorkSaveRequest) {
  return request<string>({
    url: "/creator/works",
    method: "post",
    data,
  })
}

/**
 * 更新作品
 * PUT /api/creator/works/{id}
 */
export function updateWorkApi(id: string, data: CreatorWorkSaveRequest) {
  return request<void>({
    url: `/creator/works/${id}`,
    method: "put",
    data,
  })
}

/**
 * 删除作品
 * DELETE /api/creator/works/{id}
 */
export function deleteWorkApi(id: string) {
  return request<void>({
    url: `/creator/works/${id}`,
    method: "delete",
  })
}



/**
 * 获取 OSS 上传凭证
 * POST /api/creator/works/upload-token
 */
export function getUploadTokenApi(typeRole: CreatorUploadTokenRequest) {
  return request<OSSTokenVO>({
    url: "/creator/works/upload-token",
    method: "post",
    data: { role: typeRole },
  })
}

// ==================== 发布管理接口 ====================

/**
 * 分页查询发布管理列表（含统计）
 * GET /api/creator/works/releases
 */
export function pageReleasesApi(params: CreatorReleasePageRequest) {
  return request<CreatorReleaseManagementVO>({
    url: "/creator/works/releases",
    method: "get",
    params,
  })
}

/**
 * 分页查询可发布作品列表
 * GET /api/creator/works/release-candidates
 */
export function pageReleaseCandidatesApi(params: PageQuery & { keyword?: string }) {
  return request<PageResult<CreatorWorkVO>>({
    url: "/creator/works/release-candidates",
    method: "get",
    params,
  })
}



// ==================== CreatorHub OSS 上传凭证响应 ====================

/** 文件类型枚举 */
export type FileRole =
  | "COVER_IMAGE"   // 封面图
  | "GIF_FILE"      // GIF 文件
  | "EDITABLE_JSON" // 可编辑文件 (JSON)
  | "STATIC_BIN"    // 静态二进制文件

/** OSS 上传凭证响应（详细版） */
export interface OSSTokenFullVO {
  endpoint: string
  region: string
  bucketName: string
  accessKeyId: string
  accessKeySecret: string
  expiration: string
  token: string
  requestId?: string
  path?: string
  fullPath?: string
}

/**
 * 获取文件上传凭证
 * POST /api/creator/works/upload-token
 * @param role 文件角色类型
 */
export function getWorkUploadTokenApi(role: FileRole, fileName?: string, fileSize?: number) {
  return request<OSSTokenFullVO>({
    url: "/creator/works/upload-token",
    method: "post",
    data: { role, fileName, fileSize },
  })
}




