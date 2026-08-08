import { request } from '@/service/request';

/** ========== 工作台 ========== */

/** 工作台 - 概览 */
export function fetchWorkbenchOverview() {
  return request<Api.Literature.WorkbenchOverview>({
    url: '/literature/workbench/overview',
    method: 'get',
  });
}

/** ========== 文稿 ========== */

/** 文稿列表 */
export function fetchManuscriptList(params?: Api.Literature.ManuscriptSearchParams) {
  return request<Api.Literature.ManuscriptList>({
    url: '/literature/manuscript/list',
    method: 'get',
    params,
  });
}

/** 最近文稿列表 */
export function fetchManuscriptRecent() {
  return request<Api.Literature.SimpleList<Api.Literature.Manuscript>>({
    url: '/literature/manuscript/recent',
    method: 'get',
  });
}

/** 文稿详情 */
export function fetchManuscriptDetail(id: CommonType.IdType) {
  return request<Api.Literature.ManuscriptDetail>({
    url: `/literature/manuscript/${id}`,
    method: 'get',
  });
}

/** 新建文稿 */
export function fetchManuscriptCreate(data: Api.Literature.CreateManuscriptParams) {
  return request<Api.Literature.Manuscript>({
    url: '/literature/manuscript',
    method: 'post',
    data,
  });
}

/** 更新文稿 */
export function fetchManuscriptUpdate(data: Api.Literature.UpdateManuscriptParams) {
  return request<Api.Literature.Manuscript>({
    url: '/literature/manuscript',
    method: 'put',
    data,
  });
}

/** 自动保存文稿 */
export function fetchManuscriptSave(data: Api.Literature.SaveManuscriptParams) {
  return request<Api.Literature.Manuscript>({
    url: '/literature/manuscript/save',
    method: 'put',
    data,
  });
}

/** 修改文稿状态 */
export function fetchManuscriptChangeStatus(data: Api.Literature.ChangeStatusParams) {
  return request<Api.Literature.Manuscript>({
    url: '/literature/manuscript/status',
    method: 'put',
    data,
  });
}

/** 复制文稿 */
export function fetchManuscriptCopy(id: CommonType.IdType) {
  return request<Api.Literature.Manuscript>({
    url: `/literature/manuscript/copy/${id}`,
    method: 'post',
  });
}

/** 绑定标签 */
export function fetchManuscriptBindTags(data: Api.Literature.BindTagsParams) {
  return request<void>({
    url: '/literature/manuscript/tags',
    method: 'put',
    data,
  });
}

/** 移入回收站 */
export function fetchManuscriptRemove(id: CommonType.IdType) {
  return request<void>({
    url: `/literature/manuscript/${id}`,
    method: 'delete',
  });
}

/** 回收站恢复 */
export function fetchManuscriptRestore(id: CommonType.IdType) {
  return request<Api.Literature.Manuscript>({
    url: `/literature/manuscript/restore/${id}`,
    method: 'put',
  });
}

/** 永久删除 */
export function fetchManuscriptPermanentDelete(id: CommonType.IdType) {
  return request<void>({
    url: `/literature/manuscript/permanent/${id}`,
    method: 'delete',
  });
}

/** ========== 素材 ========== */

/** 素材列表 */
export function fetchMaterialList(params?: Api.Literature.MaterialSearchParams) {
  return request<Api.Literature.MaterialList>({
    url: '/literature/material/list',
    method: 'get',
    params,
  });
}

/** 素材详情 */
export function fetchMaterialDetail(id: CommonType.IdType) {
  return request<Api.Literature.Material>({
    url: `/literature/material/${id}`,
    method: 'get',
  });
}

/** 新建素材 */
export function fetchMaterialCreate(data: Api.Literature.CreateMaterialParams) {
  return request<Api.Literature.Material>({
    url: '/literature/material',
    method: 'post',
    data,
  });
}

/** 更新素材 */
export function fetchMaterialUpdate(data: Api.Literature.UpdateMaterialParams) {
  return request<Api.Literature.Material>({
    url: '/literature/material',
    method: 'put',
    data,
  });
}

/** 删除素材 */
export function fetchMaterialRemove(id: CommonType.IdType) {
  return request<void>({
    url: `/literature/material/${id}`,
    method: 'delete',
  });
}

/** ========== 标签 ========== */

/** 标签列表 */
export function fetchTagList(params?: Api.Literature.TagSearchParams) {
  return request<Api.Literature.TagList>({
    url: '/literature/tag/list',
    method: 'get',
    params,
  });
}

/** 标签详情 */
export function fetchTagDetail(id: CommonType.IdType) {
  return request<Api.Literature.Tag>({
    url: `/literature/tag/${id}`,
    method: 'get',
  });
}

/** 新建标签 */
export function fetchTagCreate(data: Api.Literature.CreateTagParams) {
  return request<Api.Literature.Tag>({
    url: '/literature/tag',
    method: 'post',
    data,
  });
}

/** 更新标签 */
export function fetchTagUpdate(data: Api.Literature.UpdateTagParams) {
  return request<Api.Literature.Tag>({
    url: '/literature/tag',
    method: 'put',
    data,
  });
}

/** 删除标签 */
export function fetchTagRemove(id: CommonType.IdType) {
  return request<void>({
    url: `/literature/tag/${id}`,
    method: 'delete',
  });
}

/** ========== 设置 ========== */

/** 获取设置 */
export function fetchSettingGet() {
  return request<Api.Literature.Setting>({
    url: '/literature/setting',
    method: 'get',
  });
}

/** 更新设置 */
export function fetchSettingUpdate(data: Api.Literature.UpdateSettingParams) {
  return request<Api.Literature.Setting>({
    url: '/literature/setting',
    method: 'put',
    data,
  });
}

/** ========== 上传 ========== */

/** 图片上传（免权限） */
export function fetchLiteratureUpload(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<Api.Literature.UploadResponse>({
    url: '/literature/upload',
    method: 'post',
    data: formData,
  });
}
