
/***************************TODO: CreatorHub 审核提交、撤回和下架 **************/

import type { PageQuery } from "@/shared/types"
import { request } from "@/http/request"

/** 作品分页查询参数 */
export interface CreatorWorkPageRequest extends PageQuery {
  keyword?: string
  sortBy?: "CREATE_TIME" | "LAST_VIEW" | "TITLE"
  direction?: "ASC" | "DESC"
}

/** 作品发布审核提交请求 */
export interface WorkSubmitRequest {
  tagCode?: string
}

/**
 * 提交作品审核（发布）
 * POST /creator/works/{id}/submit
 */
export function submitWorkApi(id: string, data?: WorkSubmitRequest) {
  return request<void>({
    url: `/creator/works/${id}/submit`,
    method: "post",
    data,
  })
}

/**
 * 提交作品更新审核
 * POST /api/creator/works/{id}/submit-update
 */
export function submitWorkUpdateApi(id: string, data?: WorkSubmitRequest) {
  return request<void>({
    url: `/creator/works/${id}/submit-update`,
    method: "post",
    data,
  })
}

/**
 * 撤回作品审核申请
 * POST /api/creator/works/{id}/withdraw
 */
export function withdrawWorkApi(id: string) {
  return request<void>({
    url: `/creator/works/${id}/withdraw`,
    method: "post",
  })
}

/**
 * 下架已发布作品
 * POST /api/creator/works/{id}/unpublish
 */
export function unpublishWorkApi(id: string) {
  return request<void>({
    url: `/creator/works/${id}/unpublish`,
    method: "post",
  })
}

/**
 * 从发布管理中移除作品,这个会检查
 * DELETE /api/creator/works/releases/{id}
 */
export function removeFromReleasesApi(id: string) {
  return request<void>({
    url: `/creator/works/releases/${id}`,
    method: "delete",
  })
}