<template>
  <main class="content">
    <!-- 顶部标题栏 -->
    <header class="topbar">
      <h2 class="work-title">{{ $t('common.pxm_nav_works') }}</h2>
      <div class="top-actions">
        <!-- Upload 上传按钮 pxm_action_upload -->
        <el-button pxm_action_upload @click="triggerUpload">
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </template>
          {{ $t('common.pxm_action_upload') }}
        </el-button>
        <!-- Create 创建空白作品 pxm_action_create -->
        <el-button type="primary" class="black-btn" pxm_action_create @click="goCreateEditor">
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </template>
          {{ $t('common.pxm_action_create') }}
        </el-button>
        <!-- 隐藏文件上传input -->
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="handleFileUpload"
        />
      </div>
    </header>

    <!-- 筛选工具栏区域 -->
    <div class="filterbar">
      <!-- 预览设备选择器 el-popover -->
      <el-popover
        v-model:visible="devicePanelOpen"
        placement="bottom-start"
        trigger="click"
        width="260"
      >
        <template #reference>
          <div class="preview-device-trigger">
            <span>{{ $t('common.pxm_device_preview_devices') }}</span>
            <strong>{{ selectedDevices.map((d) => d.name).join('、') }}</strong>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </template>
        <div>
          <div class="preview-device-panel-head">
            {{ $t('common.pxm_device_bound') }}
          </div>
          <el-checkbox-group v-model="selectedDeviceIds">
            <div class="device-list">
              <div
                v-for="dev in deviceList"
                :key="dev.id"
                class="device-item"
                :class="{ offline: dev.online !== 'ONLINE' }"
              >
                <el-checkbox :label="dev.id">
                  <span :class="['device-dot', dev.online === 'ONLINE' ? 'online' : 'offline']" />
                  <span class="device-name">{{ dev.name }}</span>
                  <em>{{
                    dev.online === 'ONLINE'
                      ? $t('common.pxm_device_online')
                      : $t('common.pxm_device_offline')
                  }}</em>
                </el-checkbox>
              </div>
            </div>
          </el-checkbox-group>
        </div>
      </el-popover>

      <!-- 右侧：搜索 + 排序 + 视图切换 -->
      <div class="filterbar-right">
        <el-input
          v-model="searchQuery"
          :placeholder="$t('common.pxm_search_placeholder')"
          clearable
          class="works-search"
        >
          <template #prefix>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </template>
        </el-input>

        <!-- 排序下拉 popover -->
        <el-popover
          v-model:visible="sortMenuOpen"
          placement="bottom-start"
          trigger="click"
          width="120"
        >
          <template #reference>
            <el-button @click.stop>
              {{ sortLabel }}
              <svg
                style="margin-left: 4px"
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </el-button>
          </template>

          <div class="sort-group">
            <p class="sort-title">{{ $t('common.pxm_sort_by') }} <span pxm_sort_by /></p>
            <el-radio-group v-model="sortBy" @change="applySort">
              <el-radio v-for="item in sortByOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </div>
          <div class="sort-group">
            <p class="sort-title">{{ $t('common.pxm_sort_order') }} <span pxm_sort_order /></p>
            <el-radio-group v-model="sortOrder" @change="applySort">
              <el-radio v-for="item in sortOrderOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </div>
        </el-popover>

        <!-- 视图切换：el-radio-group 按钮组 -->
        <el-radio-group v-model="viewMode" size="default" class="view-mode-group">
          <el-radio-button :class="{ 'is-active': viewMode === 'grid' }" label="grid">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3v18" />
              <path d="M3 12h18" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </el-radio-button>
          <el-radio-button :class="{ 'is-active': viewMode === 'list' }" label="list">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
              <path d="M3 6h.01" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M8 6h13" />
            </svg>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 作品列表区域 -->
    <template v-if="viewMode === 'grid'">
      <el-empty
        v-if="sortedWorkList.length === 0"
        :description="$t('common.pxm_editor_library_empty')"
      />
      <section
        v-else
        class="works-grid"
        v-infinite-scroll="loadMore"
        :infinite-scroll-disabled="!hasMore"
        :infinite-scroll-distance="100"
      >
        <article
          v-for="work in sortedWorkList"
          :key="work.id"
          class="work-card clickable-work"
          tabindex="0"
          @click="openEditWork(work)"
        >
          <div class="preview preview-dark-cluster">
            <img
              v-if="work.coverUrl"
              :src="work.coverUrl"
              :alt="work.title"
              class="preview-image"
            />
          </div>
          <div class="work-meta">
            <div>
              <h2>{{ work.title }}</h2>
              <p>{{ work.createdAt }}</p>
            </div>
            <div class="card-actions">
              <el-button
                class="pxm_action_edit_btn"
                size="small"
                pxm_action_edit
                @click.stop="openEditWork(work)"
              >
                {{ $t('common.pxm_action_edit') }}
              </el-button>
              <div class="card-icon-actions">
                <el-button
                  circle
                  size="small"
                  pxm_action_preview
                  :title="$t('common.pxm_action_preview')"
                  @click.stop="sendWorkToDevice(work)"
                >
                  <template #icon>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                  </template>
                </el-button>
                <el-button
                  circle
                  size="small"
                  type="danger"
                  pxm_action_delete
                  :title="$t('common.pxm_action_delete')"
                  @click.stop="handleDeleteWork(work)"
                >
                  <template #icon>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </template>
                </el-button>
              </div>
            </div>
          </div>
        </article>
        <div v-if="loadingMore" class="infinite-loading-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>Loading...</span>
        </div>
      </section>
    </template>

    <template v-else>
      <el-empty
        v-if="sortedWorkList.length === 0"
        :description="$t('common.pxm_editor_library_empty')"
      />
      <section
        v-else
        class="works-list"
        v-infinite-scroll="loadMore"
        :infinite-scroll-disabled="!hasMore"
        :infinite-scroll-distance="100"
      >
        <el-table
          :data="sortedWorkList"
          stripe
          style="width: 100%"
          @row-click="handleRowClick"
          v-loading="loadingMore"
          element-loading-text="Loading..."
        >
          <el-table-column :label="$t('common.pxm_column_name')" min-width="240">
            <template #default="{ row }">
              <div class="row-name">
                <div class="row-preview preview-dark-cluster">
                  <img
                    v-if="row.coverUrl"
                    :src="row.coverUrl"
                    :alt="row.title"
                    class="preview-image"
                  />
                  <!-- <span class="kind-icon bubble">&#9670;</span> -->
                </div>
                <span>{{ row.title }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_modified')" width="140">
            <template #default="{ row }">
              <span class="row-time">{{ formatDate(row.lastViewTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_created')" width="140">
            <template #default="{ row }">
              <span class="row-time">{{ row.createdAt }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_actions')" width="220" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button size="small" pxm_action_preview @click.stop="sendWorkToDevice(row)">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  &nbsp;{{ $t('common.pxm_action_preview') }}
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  pxm_action_delete
                  @click.stop="handleDeleteWork(row)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                  &nbsp;{{ $t('common.pxm_action_delete') }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>
  </main>
</template>

<script lang="ts" setup>
import {
  createWorkApi,
  updateWorkApi,
  deleteWorkApi,
  pageWorksApi,
  CreatorWorkVO,
} from '@/api/works'
import type { CreatorDeviceVO, CreatorWorkSaveRequest } from '@/api/device'
import { listDevicesApi, previewToDeviceApi } from '@/api/device'
import {
  checkFile,
  uploadUserFile,
  uploadGif,
  uploadImage,
  uploadStaticImgCover,
  uploadStaticImageWithJson,
  uploadGifWithFrames,
} from '@/lib/images/uploadFile'

import {
  decodeGifFrames,
  imageFromFile,
  renderImageToPixels,
} from '@/modules/pixel-editor/core/image-import'

import { CANVAS_WIDTH, CANVAS_HEIGHT, WIDTH, HEIGHT } from '@/modules/pixel-editor/core/index'

import { ref, computed, onMounted, watch } from 'vue'
import { useAppI18n } from '@/common/composables/useI18n'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { type } from '../../../auto-imports'

const router = useRouter()
const { t } = useAppI18n()

// ===================== 基础状态 =====================
const fileInputRef = ref<HTMLInputElement | null>(null)
const sortMenuOpen = ref(false)
const devicePanelOpen = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const searchQuery = ref('')

// 监听搜索关键词变化，自动触发搜索
watch(searchQuery, () => {
  fetchWorksInitial()
})

// 加载状态
const loading = ref(false)

// ===================== 接口数据适配 =====================
/** 作品列表条目 */
interface WorkItem {
  type: string
  id: string
  title: string
  createdAt: string
  createTimeStamp: number
  lastViewTime: number
  coverUrl: string
  gifFileUrl: string
  gifFileSize: number
  editableFileUrl: string
  binFileUrl: string
  binFileSize: number
}

/** 将接口 CreatorWorkVO 适配为 UI 内部 workItem */
function toWorkItem(api: CreatorWorkVO): WorkItem {
  return {
    type: api?.type ? api?.type : '',
    id: api.id,
    title: api.title,
    createdAt: formatDate(api.createTime),
    createTimeStamp: api.createTime ?? 0,
    lastViewTime: api.lastViewTime ?? api.updateTime ?? 0,
    coverUrl: api.coverUrl ?? '',
    gifFileUrl: api.gifFileUrl ?? '',
    gifFileSize: api.gifFileSize ?? 0,
    editableFileUrl: api.editableFileUrl ?? '',
    binFileSize: api.binFileSize ?? 0,
    binFileUrl: api.binFileUrl ?? '',
  }
}

/** 分页参数 */
const pageNumber = ref(1)
const pageSize = ref(20)

// 无限滚动状态
const hasMore = ref(true)
const loadingMore = ref(false)
const totalCount = ref(0)

// ============ 作品列表（来自接口） ============
const workList = ref<WorkItem[]>([])

/** 首屏加载作品列表（替换而非追加） */
async function fetchWorksInitial() {
  loading.value = true
  hasMore.value = true
  pageNumber.value = 1
  try {
    const params = buildSortParams()
    const res = await pageWorksApi({
      pageNumber: 1,
      pageSize: pageSize.value,
      keyword: searchQuery.value.trim() || undefined,
      sortBy: params.sortBy,
      direction: params.sortOrder,
    })
    totalCount.value = res.result?.total ?? 0
    workList.value = (res.result?.list ?? []).map(toWorkItem)
    hasMore.value = workList.value.length < totalCount.value
  } catch (e) {
    console.error('fetchWorks error:', e)
    ElMessage.error(t('common.pxm_work_state_changed'))
  } finally {
    loading.value = false
  }
}

/** 滚动加载更多（追加而非替换） */
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  try {
    loadingMore.value = true
    const nextPage = pageNumber.value + 1
    const params = buildSortParams()
    const res = await pageWorksApi({
      pageNumber: nextPage,
      pageSize: pageSize.value,
      keyword: searchQuery.value.trim() || undefined,
      sortBy: params.sortBy,
      direction: params.sortOrder,
    })
    totalCount.value = res.result?.total ?? totalCount.value
    const newItems = (res.result?.list ?? []).map(toWorkItem)
    workList.value = [...workList.value, ...newItems]
    pageNumber.value = nextPage
    hasMore.value = workList.value.length < totalCount.value
  } catch (e) {
    console.error('loadMore error:', e)
  } finally {
    loadingMore.value = false
  }
}

/**
 * @deprecated Use fetchWorksInitial instead.
 */
async function fetchWorks() {
  await fetchWorksInitial()
}

/** 将 UI 排序值映射为接口 sortBy */
function buildSortParams() {
  const map = {
    name: 'TITLE',
    createTime: 'CREATED_AT',
    lastView: 'LAST_VIEW_TIME',
  } as const
  return {
    sortBy: map[sortBy.value],
    sortOrder: sortOrder.value.toUpperCase() as 'ASC' | 'DESC',
  }
}

// ============ 排序配置 ============
const sortBy = ref<'name' | 'createTime' | 'lastView'>('lastView')
const sortByOptions = computed(() => [
  { label: t('common.pxm_sort_alphabetical'), value: 'name' },
  { label: t('common.pxm_sort_date_created'), value: 'createTime' },
  { label: t('common.pxm_sort_last_viewed'), value: 'lastView' },
])
const sortOrder = ref<'asc' | 'desc'>('desc')
const sortOrderOptions = computed(() => [
  { label: t('common.pxm_sort_oldest'), value: 'asc' },
  { label: t('common.pxm_sort_newest'), value: 'desc' },
])
const sortLabel = computed(() => {
  const map = {
    name: t('common.pxm_sort_alphabetical'),
    createTime: t('common.pxm_sort_date_created'),
    lastView: t('common.pxm_sort_last_viewed'),
  }
  // alert(JSON.stringify(map[sortBy.value]))
  return map[sortBy.value]
})

const applySort = () => {
  sortMenuOpen.value = false
  fetchWorksInitial()
}

// ===================== 预览设备列表（来自接口） =====================
const DEVICE_SESSION_KEY = 'creator.preview.deviceIds'
const deviceList = ref<CreatorDeviceVO[]>([])
const selectedDeviceIds = ref<string[]>([])

async function fetchDevices() {
  try {
    const res = await listDevicesApi()
    deviceList.value = res.result ?? []
    // 从 sessionStorage 恢复之前选中的设备
    const saved = sessionStorage.getItem(DEVICE_SESSION_KEY)
    if (saved) {
      try {
        const ids: string[] = JSON.parse(saved)
        // 只恢复仍然在设备列表中的 id（避免已解绑设备残留）
        selectedDeviceIds.value = ids.filter((id) => deviceList.value.some((d) => d.id === id))
      } catch {
        // 解析失败则忽略
      }
    }
  } catch (e) {
    console.error('fetchDevices error:', e)
  }
}

// 设备选择变化时实时保存到 sessionStorage
watch(
  selectedDeviceIds,
  (ids) => {
    sessionStorage.setItem(DEVICE_SESSION_KEY, JSON.stringify(ids))
  },
  { deep: true }
)

const selectedDevices = computed(() => {
  return deviceList.value.filter((item) => selectedDeviceIds.value.includes(item.id))
})

// ============ 排序后列表（本地二次排序） ============
const sortedWorkList = computed(() => {
  let arr = [...workList.value]
  // 搜索过滤（本地兜底，接口已过滤）
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    arr = arr.filter((w) => w.title.toLowerCase().includes(q))
  }
  // 本地排序
  arr.sort((a, b) => {
    let valA, valB
    if (sortBy.value === 'name') {
      valA = a.title
      valB = b.title
      return sortOrder.value === 'asc'
        ? valA.localeCompare(valB, 'zh-CN')
        : valB.localeCompare(valA, 'zh-CN')
    } else if (sortBy.value === 'createTime') {
      valA = a.createTimeStamp
      valB = b.createTimeStamp
    } else {
      valA = a.lastViewTime
      valB = b.lastViewTime
    }
    return sortOrder.value === 'asc' ? valA - valB : valB - valA
  })
  return arr
})

// ===================== 业务事件 =====================
const triggerUpload = () => {
  fileInputRef.value?.click()
}

const formatDate = (ts: number | null | undefined): string => {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

// Image import

/**
 * 导入静态图
 * @param event
 */
async function handleLoadStaticImage(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  let imageFile = await imageFromFile(file)
  // await renderImageToPixels(imageFile)

  console.log(imageFile, 'imageFile')
}

const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) return

  const fileType = file.type

  await checkFile(file, t)

  try {
    if (fileType === 'image/gif') {
      // Step 1: 解析 GIF 为多帧数据
      const gifFrames = await decodeGifFrames(file)

      console.log('GIF parsed to frames:', gifFrames.length, 'frames')

      // Step 2: 将每一帧转换为像素数据
      const framesData = gifFrames.map(({ image, delay }) => {
        const pixels = renderImageToPixels(image, {
          fit: 'contain',
          cropX: 0.5,
          cropY: 0.5,
          zoom: 1,
          preserveColors: true,
          outputWidth: WIDTH,
          outputHeight: HEIGHT,
          allowUpscale: false,
          dither: 'none',
        })

        return {
          id: `frame_${Date.now()}_${Math.random()}`,
          delay: delay,
          viewportX: 0,
          viewportY: 0,
          layers: [
            {
              id: `layer_${Date.now()}_${Math.random()}`,
              name: 'Layer 1',
              visible: true,
              opacity: 1,
              pixels: pixels,
              canvasPixels: {},
            },
          ],
        }
      })

      // Step 3: 上传 GIF + 所有帧数据
      const uploadResult = await uploadGifWithFrames(file, framesData)

      console.log('GIF upload result:', uploadResult)

      // Step 4: 创建作品
      const workData: CreatorWorkSaveRequest = {
        title: file.name.split('.')[0],
        type: 'GIF',
        coverUrl: uploadResult.cover,
        gifFileUrl: uploadResult.fileUrl,
        gifFileSize: uploadResult.fileSize,
        editableFileUrl: uploadResult.binFileUrl,
        binFileUrl: uploadResult.binFileUrl,
        binFileSize: uploadResult.binSize,
        width: WIDTH,
        height: HEIGHT,
        frameCount: framesData.length,
        frameDelay: framesData[0]?.delay || 120,
      }

      const workResult = await createWorkApi(workData)

      console.log('GIF work created:', workResult)

      // Step 5: 刷新作品列表
      ElMessage.success(t('common.pxm_upload_success'))
      fetchWorks()
    } else if (fileType === 'image/jpeg' || fileType === 'image/png') {
      // 静态图上传逻辑
      await handleStaticImageUpload(file)
    } else {
      throw new Error(t('common.fileTypeError'))
    }
  } catch (error) {
    console.error('Upload failed:', error)
    ElMessage.error(t('common.pxm_upload_failed'))
  } finally {
    target.value = ''
    fileInputRef.value && (fileInputRef.value.value = '')
  }
}

/**
 * 处理静态图上传
 */
const handleStaticImageUpload = async (file: File) => {
  // Step 1: 解析图片为像素数据（输出 32×16 = 512 像素点）
  const imageFile = await imageFromFile(file)
  const pixels = renderImageToPixels(imageFile, {
    fit: 'contain',
    cropX: 0.5,
    cropY: 0.5,
    zoom: 1,
    preserveColors: true,
    outputWidth: WIDTH,
    outputHeight: HEIGHT,
    allowUpscale: false,
    dither: 'none',
  })

  console.log('Image parsed to pixels:', pixels.length, 'pixels')

  // Step 1.5: 校验像素数据
  const validPixels = pixels.filter((p) => p != null)
  console.log('Pixel data validation:', {
    total: pixels.length,
    valid: validPixels.length,
    nullCount: pixels.length - validPixels.length,
    sample: pixels.slice(0, 8),
  })
  if (validPixels.length === 0) {
    ElMessage.error('图片解析失败，未能提取到有效像素数据，请确认图片格式正确')
    return
  }

  // Step 2: 创建项目数据
  const projectId = `project_${Date.now()}`
  const projectData = {
    id: projectId,
    version: 4,
    name: file.name.split('.')[0],
    width: WIDTH,
    height: HEIGHT,
    currentFrameIndex: 0,
    activeLayer: 0,
    frames: [
      {
        id: `frame_${Date.now()}`,
        delay: 120,
        viewportX: 0,
        viewportY: 0,
        layers: [
          {
            id: `layer_${Date.now()}`,
            name: 'Layer 1',
            visible: true,
            opacity: 1,
            pixels: pixels,
            canvasPixels: {},
          },
        ],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  // Step 3: 上传静态图 + JSON 数据
  const uploadResult = await uploadStaticImageWithJson(file, projectData)

  console.log('Upload result:', uploadResult)

  // Step 4: 创建作品
  const workData: CreatorWorkSaveRequest = {
    title: file.name.split('.')[0],
    type: 'STATIC',
    coverUrl: uploadResult.coverUrl,
    editableFileUrl: uploadResult.editableFileUrl,
    binFileUrl: uploadResult.binFileUrl,
    binFileSize: uploadResult.binFileSize,
    width: WIDTH,
    height: HEIGHT,
    frameCount: 1,
    frameDelay: 120,
  }

  const workResult = await createWorkApi(workData)

  console.log('Work created:', workResult)

  // Step 5: 刷新作品列表
  ElMessage.success(t('common.pxm_upload_success'))
  fetchWorks()
}

const goCreateEditor = () => {
  // TODO:这里和导入有点区别
  // 直接点击进入，创建作品，进入路由：
  router.push({ path: '/pixel-editor' })

  return

  // TODO:这里和导入有点区别
  // createWorkApi({ title: 'Untitled' })
  //   .then((res) => {
  //     router.push({ path: '/editor', query: { workId: res.result } })
  //   })
  //   .catch(() => {
  //     ElMessage.error(t('common.pxm_upload_failed'))
  //   })
}

const openEditWork = (work: WorkItem) => {
  // updateWorkApi(work.id, { title: work.title }).catch(() => {})
  router.push({ path: '/pixel-editor', query: { workId: work.id } })
}

function handleRowClick(row: any) {
  openEditWork(row as WorkItem)
}

const sendWorkToDevice = async (work: WorkItem) => {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning(t('common.pxm_device_preview_before_bind'))
    return
  }
  try {
    console.log('sendWorkToDevice-work', work)
    const fileUrl = work.coverUrl || work.gifFileUrl || work.editableFileUrl || ''
    if (!fileUrl) {
      ElMessage.warning(t('common.pxm_preview_unavailable'))
      return
    }

    // 增加一下这里的work
    let deviceLength = selectedDevices.value.map((d) => d.id).length
    const res = await previewToDeviceApi({
      deviceIds: selectedDevices.value.map((d) => d.id),
      type: work.type as any,
      fileUrl: work.type === 'GIF' ? work.gifFileUrl : work.binFileUrl,
      fileSize: work.gifFileUrl ? work?.gifFileSize : work.binFileSize,
    })
    const failed = (res.result ?? []).filter((r) => !r.success)
    if (failed.length === 0) {
      ElMessage.success(t('common.pxm_editor_push_selected_success'))
      // ElMessage.success(
      //   `【预览推送】作品《${work.title}》下发至：${selectedDevices.value.map((d) => d.name).join('、')}`
      // )
    } else {
      if (deviceLength == failed.length) {
        // 长度相等
        ElMessage.error(t('common.pxm_editor_push_no_device'))
      } else {
        ElMessage.error(t('common.pxm_device_partial_failed'))
      }

      // ElMessage.warning(`部分设备推送失败：${failed.map((f) => f.message).join('；')}`)
    }
  } catch (e) {
    console.error('preview error:', e)
    ElMessage.error(t('common.pxm_editor_push_failed'))
  }
}

const handleDeleteWork = (work: WorkItem) => {
  ElMessageBox.confirm(`${t('common.pxm_delete_message')}`, t('common.pxm_delete_title'), {
    confirmButtonText: t('common.pxm_common_confirm'),
    cancelButtonText: t('common.pxm_common_cancel'),
    type: 'warning',
  })
    .then(() => {
      return deleteWorkApi(work.id)
    })
    .then(() => {
      return fetchWorks()
    })
    .then(() => {
      ElMessage.success(t('common.pxm_delete_success'))
    })
    .catch((e) => {
      if (e !== 'cancel') {
        console.error('delete work failed:', e)
        ElMessage.error(t('common.pxm_delete_failed'))
      }
    })
}

// 初始化
onMounted(() => {
  fetchWorksInitial()
  fetchDevices()
})
</script>

<!-- <style lang="css" src="./index.css"> -->

<style lang="css" scoped>
.content {
  padding: 20px;
  color: #374151;
  background: #fff;
  min-height: 100vh;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid #e4e4e7;
  margin-bottom: 16px;
}
.work-title {
  font-size: 20px;
  font-weight: 600;
  color: #27272a;
  margin: 0;
}
.top-actions {
  display: flex;
  gap: 10px;
}
.hidden-file-input {
  display: none;
}

.filterbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.works-search {
  width: 200px;

  :deep(.el-input__wrapper) {
    min-height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    box-shadow: 0 0 0 1px #d1d5db inset;

    .el-input__prefix {
      margin-right: 8px;
      color: #9ca3af;
    }

    .el-input__inner {
      font-size: 13px;
      color: #374151;

      &::placeholder {
        color: #9ca3af;
      }
    }

    &:hover {
      box-shadow: 0 0 0 1px #9ca3af inset !important;
    }

    &.is-focus {
      box-shadow: 0 0 0 1px #667eea inset !important;
    }
  }
}

/* 右侧工具组：搜索 + 排序 + 视图切换，整体右对齐 */
.filterbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
.preview-device-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f3f4f6;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
}
.preview-device-trigger strong {
  color: #111827;
  font-weight: 600;
}
.preview-device-trigger svg {
  color: #6b7280;
}

.preview-device-panel-head {
  padding: 6px 4px;
  color: #9ca3af;
  font-size: 12px;
}
.device-list {
  margin-top: 4px;
}
.device-item {
  padding: 4px 0;
}
.device-item.offline {
  opacity: 0.45;
}

.device-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
}
.device-dot.online {
  background: #22c55e;
}
.device-dot.offline {
  background: #d1d5db;
}
.device-name {
  font-weight: 400;
}
.device-item em {
  font-style: normal;
  font-size: 12px;
  color: #6b7280;
  margin-left: 6px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sort-group {
  margin-bottom: 10px;
}
.sort-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

/* 网格视图：每行最多6个 */
@media (min-width: 1200px) {
  .works-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

/* 中等屏幕：每行4个 */
@media (min-width: 900px) and (max-width: 1199px) {
  .works-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 小屏幕：每行3个 */
@media (min-width: 600px) and (max-width: 899px) {
  .works-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 超小屏幕：每行2个 */
@media (max-width: 599px) {
  .works-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.work-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: 0.2s;
}
.work-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.preview {
  height: 140px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
   /* 关闭平滑线性插值，启用锐利渲染 */
  image-rendering: crisp-edges;
  /* Chrome/Edge 兼容像素化放大 */
  image-rendering: pixelated;
  /* 兼容旧版 Safari */
  image-rendering: -webkit-optimize-contrast;

}
.work-meta {
  padding: 12px;
  color: #374151;
}
.work-meta h2 {
  margin: 0;
  font-size: 15px;
  color: #111827;
}
.work-meta p {
  margin: 4px 0 10px;
  color: #6b7280;
  font-size: 12px;
}
.card-actions {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 8px;
  align-items: center;
}
.card-icon-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.pxm_action_edit_btn {
  width: 100%;
}

/* ============== List View (el-table) Styles ============== */
.works-list .row-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.works-list .row-preview {
  width: auto;
  min-width: 50px;
  height: 50px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.works-list .row-preview .preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.works-list .kind-icon {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 11px;
  color: #6b7280;
}

.works-list .kind-icon.bubble {
  background: #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.works-list .row-time {
  font-size: 13px;
  color: #6b7280;
}

.works-list .row-actions {
  display: flex;
  gap: 8px;
}

/* scoped下需要深度选择器 */
:deep(.black-btn) {
  background-color: #000 !important;
  border-color: #000 !important;
}

/* 深度穿透修改内部组件样式 */
/* 未选中整体按钮样式：灰色背景 + 灰色图标文字 #d1d5db */

/* 选中状态：白色背景 + 白色图标 #fff */

/* 选中 hover 轻微浅白 */

/* 清除原生蓝色焦点阴影，替换黑色 */
:deep(.el-radio-button__orig-radio:focus-visible + .el-radio-button__inner) {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
}

/* ===== radio-button 整体组：未选=灰底，选=白底黑字 ===== */
:deep(.view-mode-group .el-radio-button__inner) {
  background-color: #f5f5f5 !important;
  border-color: #dcdfe6 !important;
  color: #909399 !important;
}
:deep(.view-mode-group .el-radio-button__inner:hover) {
  background-color: #ececec !important;
}

/* ===== 选中态：白色背景、黑色边框/图标 ===== */
:deep(.view-mode-group .is-active .el-radio-button__inner) {
  background-color: #ffffff !important;
  border-color: #000000 !important;
  color: #000000 !important;
  box-shadow: none;
}
:deep(.view-mode-group .is-active .el-radio-button__inner:hover) {
  background-color: #f9f9f9 !important;
}

/* ========== 无限滚动加载提示 ========== */
.infinite-loading-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #909399;
  font-size: 13px;
  grid-column: 1 / -1;
}
</style>
