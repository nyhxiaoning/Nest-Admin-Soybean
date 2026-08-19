<template>
  <main class="content">
    <!-- 顶部标题区域 a -->
    <header class="topbar community-topbar">
      <div>
        <h1>{{ $t('common.pxm_publish_title') }}</h1>
        <p>{{ $t('common.pxm_publish_subtitle') }}</p>
      </div>
      <el-button class="black-btn" type="primary" @click="openResourceDialog">
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
        <span>{{ $t('common.pxm_publish_apply') }}</span>
      </el-button>
    </header>

    <section class="community-page">
      <!-- 统计卡片区域 b -->
      <div class="community-stats">
        <div class="stat-card">
          <strong pxm_publish_stats_live>{{ statData.live }}</strong>
          <span>{{ $t('common.pxm_publish_stats_live') }}</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_review>{{ statData.review }}</strong>
          <span>{{ $t('common.pxm_publish_stats_review') }}</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_draft>{{ statData.draft }}</strong>
          <span>{{ $t('common.pxm_publish_stats_draft') }}</span>
        </div>
      </div>

      <section
        class="community-section"
        v-infinite-scroll="loadTableDataMore"
        :infinite-scroll-disabled="!hasMore"
        :infinite-scroll-distance="100"
      >
        <div class="community-section-head">
          <h2>{{ $t('common.pxm_publish_management') }}</h2>
          <div class="community-status-filter">
            <span>{{ $t('common.pxm_publish_status_filter') }}</span>
            <el-select
              v-model="queryParams.status"
              :placeholder="$t('common.pxm_publish_all_statuses')"
              pxm_publish_status_filter
              @change="handleStatusChange"
            >
              <el-option :label="$t('common.pxm_publish_all_statuses')" value="all" />
              <el-option :label="$t('common.pxm_publish_status_pending')" value="reviewing" />
              <el-option :label="$t('common.pxm_publish_status_live')" value="published" />
              <el-option :label="$t('common.pxm_publish_status_rejected')" value="rejected" />
              <el-option :label="$t('common.pxm_publish_status_offline')" value="offline" />
            </el-select>
          </div>
        </div>

        <!-- 发布管理表格 -->
        <el-empty
          v-if="tableData.length === 0 && !loadingInitial"
          :description="$t('common.pxm_editor_library_empty')"
        />
        <div v-else class="publish-table-wrap">
          <el-table
            :data="tableData"
            stripe
            style="width: 100%"
            v-loading="loadingMore"
            element-loading-text="Loading..."
          >
            <el-table-column :label="$t('common.pxm_publish_files')" min-width="280">
              <template #default="{ row }">
                <div class="publish-name">
                  <!-- <div class="publish-thumb" /> -->
                  <img :src="row?.coverUrl" width="128" height="64" alt="" />
                  <div>
                    <h3>{{ row.name }}</h3>
                    <em v-if="row.rejectReason" class="reject-tip"
                      >{{ $t('common.pxm_publish_reason') }}{{ row.rejectReason }}</em
                    >
                  </div>
                </div>
              </template>
            </el-table-column>
            <!-- <el-table-column :label="$t('common.pxm_publish_version')" prop="version" width="100" /> -->
            <el-table-column
              :label="$t('common.pxm_publish_last_submit')"
              prop="lastSubmit"
              width="140"
            />
            <el-table-column
              :label="$t('common.pxm_publish_latest_update')"
              prop="lastUpdate"
              width="140"
            />
            <el-table-column :label="$t('common.pxm_publish_status_filter')" width="150">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('common.pxm_column_actions')" min-width="200">
              <template #default="{ row }">
                <div class="publish-actions">
                  <!-- 无状态/默认：提交发布 -->
                  <template v-if="!row.status || row.status === 'draft'">
                    <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                      {{ $t('common.pxm_publish_apply') }}
                    </el-button>
                  </template>
                  <!-- 审核中：撤回发布 -->
                  <template v-if="row.status === 'reviewing'">
                    <el-button
                      size="small"
                      type="danger"
                      pxm_publish_withdraw
                      @click="handleWithdraw(row)"
                    >
                      {{ $t('common.pxm_publish_withdraw') }}
                    </el-button>
                  </template>
                  <!-- 已发布：发布更新 + 下架 -->
                  <template v-if="row.status === 'published'">
                    <el-button v-if="row.contentConsistent" size="small" pxm_publish_update @click="handleUpdate(row)">
                      {{ $t('common.pxm_publish_update') }}
                    </el-button>
                    <el-button
                      size="small"
                      type="warning"
                      pxm_publish_unPublish
                      @click="handleUnpublish(row)"
                    >
                      {{ $t('common.pxm_publish_unpublish') }}
                    </el-button>
                  </template>
                  <!-- 已驳回：重新发布 -->
                  <template v-if="row.status === 'rejected'">
                    <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                      {{ $t('common.pxm_publish_apply') }}
                    </el-button>
                  </template>
                  <!-- 已下架：重新发布 + 删除 -->
                  <template v-if="row.status === 'offline'">
                    <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                      {{ $t('common.pxm_publish_apply') }}
                    </el-button>
                    <el-button
                      size="small"
                      type="danger"
                      pxm_action_delete
                      @click="handleDelete(row)"
                    >
                      {{ $t('common.pxm_action_delete') }}
                    </el-button>
                  </template>
                </div>
              </template>
            </el-table-column>
            <!-- </el-table-column> -->
          </el-table>
          <div v-if="loadingMore" class="infinite-loading-tip">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>Loading...</span>
          </div>
        </div>
      </section>
    </section>

    <!-- 弹窗：三步发布流程 D E -->
    <el-dialog v-model="resourceDialogVisible" width="55%" @close="resetDialogSelect">
      <template #header>
        <div class="dialog-header-wrap">
          <span class="dialog-title">{{ $t('common.applyTitle') }}</span>
          <!-- <div class="header-desc">{{ $t('common.pxm_publish_files') }}</div> -->
        </div>
      </template>

      <!-- 步骤条 -->
      <div class="publish-steps">
        <span :class="{ done: dialogStep > 0, active: dialogStep === 0 }">
          <strong>{{ 1 }}</strong>{{ t('common.selectWork') }}
        </span><i /><span :class="{ done: dialogStep > 1, active: dialogStep === 1 }">
          <strong>{{ 2 }}</strong>{{ t('common.selectCategory') }}
        </span><i /><span :class="{ done: dialogStep > 2, active: dialogStep === 2 }">
          <strong>{{ 3 }}</strong>{{ t('common.submitSuccessStep') }}
        </span>
      </div>

      <!-- 步骤 1：选择作品 -->
      <div v-show="dialogStep === 0" class="dialog-step-content">
        <el-input
          v-model="searchDraftKey"
          :placeholder="$t('common.pxm_publish_search_placeholder')"
          clearable
          @input="handleSearchDraft"
          style="margin-bottom: 16px"
        />
        <div
          class="publish-card-list"
          v-infinite-scroll="loadMoreDrafts"
          :infinite-scroll-disabled="draftNoMore"
          :infinite-scroll-distance="100"
        >
          <el-card
            v-for="item in draftWorkList"
            :key="item.id"
            :body-style="{ padding: '0px' }"
            class="publish-work-card"
            :class="{ selected: selectedDraftId === item.id }"
            @click="selectDraftWork(item)"
          >
            <div class="publish-card-image-wrap">
              <img :src="item.coverUrl" class="publish-card-image" />
            </div>
            <div class="publish-card-body">
              <span class="publish-card-name">{{ item.name }}</span>
              <time class="publish-card-time">{{ item.updatedAt }}</time>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 步骤 2：选择分类 -->
      <div v-show="dialogStep === 1" class="dialog-step-content">
        <div class="category-layout">
          <!-- 左侧：已选作品预览 -->
          <aside class="selected-work-summary">
            <div class="resource-preview preview-dark-flow">
              <img
                v-if="selectedWorkForTags?.coverUrl"
                :src="selectedWorkForTags.coverUrl"
                class="preview-cover-img"
                alt="preview"
              />
            </div>
            <h3>{{ selectedWorkForTags?.name }}</h3>
            <p>{{ $t('common.statusDraft') }} · {{ formatDate(selectedWorkForTags?.updateTime) }}</p>
          </aside>

          <!-- 右侧：分类选择 -->
          <section class="category-panel">
            <h3>{{ $t('common.categoryPanelTitle') }}</h3>
            <p>{{ $t('common.categoryPanelHint') }}</p>
            <div class="category-options">
              <button
                v-for="cat in categoryList"
                :key="cat.tagCode"
                type="button"
                :class="{ selected: selectedCategory === cat.tagCode }"
                @click="selectedCategory = cat.tagCode"
              >
                {{ cat.name }}
              </button>
            </div>
          </section>
        </div>
      </div>

      <!-- 步骤 3：提交审核确认 -->
      <div v-show="dialogStep === 2" class="dialog-step-content">
        <div class="publish-success-step">
          <div class="publish-success-card">
            <span class="publish-success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </span>
            <h3>{{ $t('common.pxm_publish_confirm_title') }}</h3>
            <p>{{ $t('common.pxm_publish_review_notice') }}</p>
            <dl>
              <div>
                <dt>{{ $t('common.successWorkName') }}</dt>
                <dd>{{ selectedWorkForSubmit?.name || '--' }}</dd>
              </div>
              <div>
                <dt>{{ $t('common.category') }}</dt>
                <dd>{{ selectedCategoryName || '--' }}</dd>
              </div>
              <div>
                <dt>{{ $t('common.successStatus') }}</dt>
                <dd>{{ $t('common.pxm_publish_status_pending') }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer-wrap">
          <div v-if="dialogStep === 0" class="footer-left-text">
            {{ $t('common.pxm_publish_picker_footnote') }}
          </div>
          <div v-else-if="dialogStep === 1" class="footer-left-text">
            {{ $t('common.categoryFootnote') }}
          </div>
          <div v-else class="footer-left-text">
            {{ $t('common.successFootnote') }}
          </div>
          <div class="footer-btn-group">
            <el-button v-if="dialogStep == 0" @click="resourceDialogVisible = false">
              {{ $t('common.cancel') }}
            </el-button>
              <el-button v-if="dialogStep == 1 " @click="dialogStep--">
              {{ $t('common.previousStep') }}
            </el-button>
            <el-button v-if="dialogStep == 0 " type="primary" :disabled="!selectedDraftId" @click="handleStepNext">
              {{ $t('common.nextStep') }}
            </el-button>
            <el-button v-if="dialogStep ==  1 " type="primary" :disabled="!selectedCategory" @click="submitBatchPublish">
              {{ $t('common.submitReview') }}
            </el-button>
            <el-button v-if="dialogStep === 2" type="primary" :loading="submitting" @click="handleStepSubmit">
              {{ $t('common.done') }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppI18n } from '@/common/composables/useI18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, CircleCheck } from '@element-plus/icons-vue'

import {
  unpublishWorkApi,
  removeFromReleasesApi,
  withdrawWorkApi,
  submitWorkUpdateApi,
  submitWorkApi,
} from '@/api/publish'
import { pageReleasesApi, pageReleaseCandidatesApi, pageTagWorksApi } from '@/api/works'

const { t } = useAppI18n()

// ===================== 查询条件 c =====================
const queryParams = reactive({
  status: 'all',
})

// 统计数据 b
const statData = ref({
  live: 0,
  review: 0,
  draft: 0,
})

// ===================== 三步发布流程 =====================
const dialogStep = ref(0)
const categoryList = ref([])
const selectedCategory = ref('')

const selectedCategoryName = computed(() => {
  if (!selectedCategory.value) return ''
  const found = categoryList.value.find((c) => c.tagCode === selectedCategory.value)
  return found ? found.name : selectedCategory.value
})
const selectedWorkForTags = ref(null)
const selectedWorkForSubmit = ref(null)
const rejectRemark = ref('')
const submitting = ref(false)

/** 步骤间下一步 */
function handleStepNext() {
  if (dialogStep.value === 0) {
    // 步骤1 → 步骤2：需选中一个作品
    if (!selectedDraftId.value) {
      ElMessage.warning(t('common.pickerFootnote'))
      return
    }
    const work = draftWorkList.value.find((w) => w.id === selectedDraftId.value)
    selectedWorkForTags.value = work || null
    selectedWorkForSubmit.value = work || null
    loadCategoryList()
    dialogStep.value = 1
  } else if (dialogStep.value === 1) {
    // 步骤2 → 步骤3：分类可选，不强制
    dialogStep.value = 2
  }
}

/** 从接口加载分类列表 */
async function loadCategoryList() {
  try {
    const res = await pageTagWorksApi()
    const items = (res && res.result) || []
    const seen = new Set()
    const categories = []
    for (const item of items) {
      const code = item.tagCode || item.id || item.name || ''
      if (!code || seen.has(code)) continue
      seen.add(code)
      categories.push({ name: item.name || '', tagCode: code })
    }
    categoryList.value = categories
    if (categories.length === 0) {
      ElMessage.warning(t('common.pxm_publish_no_categories'))
    }
  } catch (e) {
    console.error('loadCategoryList error:', e)
    ElMessage.error(t('common.pxm_publish_load_tags_failed'))
    categoryList.value = []
  }
}

/** 步骤3：完成提交 */
async function handleStepSubmit() {
  resourceDialogVisible.value = false
  resetTableData()
}

// ========== 工具函数 ==========
const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

// ========== 接口数据适配 ==========
/** 将发布管理接口数据适配为表格行数据 */
function toTableRow(api) {
  return {
    id: api.id,
    name: api.title,
    version: api.workVersion || '',
    lastSubmit: formatDate(api.submittedTime || api.createTime),
    lastUpdate: formatDate(api.updateTime),
    status: api.status || api.publishStatus ? (api.status || api.publishStatus).toLowerCase() : '',
    rejectReason: api.rejectReason || '',
    coverUrl: api.coverUrl || '',
  }
}

// 主表格列表
const tableData = ref([])

// 表格分页状态
const tablePageNumber = ref(1)
const tablePageSize = ref(20)
const hasMore = ref(true)
const loadingMore = ref(false)
const loadingInitial = ref(false)
const tableTotalCount = ref(0)

/** 仅加载统计数据（首次加载 / 状态筛选时调用一次） */
async function loadStatsData() {
  try {
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    const res = await pageReleasesApi({
      pageNumber: 1,
      pageSize: tablePageSize.value,
      status,
    })
    statData.value.live = res.result?.publishedCount || 0
    statData.value.review = res.result?.reviewingCount || 0
    statData.value.draft = res.result?.applicableCount || 0
  } catch (e) {
    console.error('loadStatsData error:', e)
  }
}

/** 发布管理列表（追加模式，不更新统计数据） */
async function loadTableDataInitial() {
  loadingInitial.value = true
  hasMore.value = true
  try {
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    // 使用当前分页页码：首次为空则重置为1，滚动场景则从当前页继续
    const pageNum = tablePageNumber.value || 1
    const res = await pageReleasesApi({
      pageNumber: pageNum,
      pageSize: tablePageSize.value,
      status,
    })

    if (pageNum == 1) {
      statData.value.live = res.result?.publishedCount || 0
      statData.value.review = res.result?.reviewingCount || 0
      statData.value.draft = res.result?.applicableCount || 0
    }

    tableTotalCount.value = res.result?.page?.total ?? tableTotalCount.value
    const newItems = (res.result?.page?.list ?? []).map(toTableRow)
    if (tableData.value.length === 0) {
      tableData.value = newItems
    } else {
      tableData.value = [...tableData.value, ...newItems]
    }
    tablePageNumber.value = pageNum + 1
    hasMore.value = tableData.value.length < tableTotalCount.value
  } catch (e) {
    console.error('loadTableData error:', e)
    ElMessage.error(t('common.pxm_publish_action_failed'))
  } finally {
    loadingInitial.value = false
  }
}

/** 重置列表并重新加载（操作后刷新表格，不更新统计数据） */
async function resetTableData() {
  tableData.value = []
  tablePageNumber.value = 1
  hasMore.value = true
  await loadTableDataInitial()
}

/** 滚动加载更多（追加而非替换） */
async function loadTableDataMore() {
  if (loadingMore.value || loadingInitial.value || !hasMore.value) return
  try {
    loadingMore.value = true
    // 使用当前页码（不 +1，避免和 loadTableDataInitial 的递进逻辑冲突）
    const pageNum = tablePageNumber.value
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    const res = await pageReleasesApi({
      pageNumber: pageNum,
      pageSize: tablePageSize.value,
      status,
    })
    tableTotalCount.value = res.result?.page?.total ?? tableTotalCount.value
    const newItems = (res.result?.page?.list ?? []).map(toTableRow)
    tableData.value = [...tableData.value, ...newItems]
    tablePageNumber.value = pageNum + 1
    // 没有更多数据：返回为空 或 已加载总数 >= 总数
    hasMore.value = newItems.length > 0 && tableData.value.length < tableTotalCount.value
  } catch (e) {
    console.error('loadTableDataMore error:', e)
  } finally {
    loadingMore.value = false
  }
}

// ===================== 事件逻辑 a~i =====================

/** 状态筛选切换：重新加载统计数据 + 列表 */
async function handleStatusChange() {
  await loadStatsData()
  await resetTableData()
}

/** d. 打开资源选择弹窗 */
const openResourceDialog = () => {
  resourceDialogVisible.value = true
  loadDraftWorkList()
}

/** 重置弹窗所有状态 */
const resetDialogSelect = () => {
  searchDraftKey.value = ''
  selectedDraftId.value = ''
  draftWorkList.value = []
  draftPage.value = 1
  draftTotal.value = 0
  draftLoadingMore.value = false
  dialogStep.value = 0
  categoryList.value = []
  selectedCategory.value = ''
  selectedWorkForTags.value = null
  selectedWorkForSubmit.value = null
  rejectRemark.value = ''
  submitting.value = false
}

/** e. 批量提交发布 */
const submitBatchPublish = async  () => {
  if (!selectedWorkForSubmit.value) return
  submitting.value = true
  try {
    const workId = selectedWorkForSubmit.value.id
    const tagCode = selectedCategory.value || undefined
    const remark = rejectRemark.value || undefined
    await submitWorkApi(workId, { tagCode, remark })
    ElMessage.success(t('common.submitSuccessTitle'))
    dialogStep.value = 2
  } catch (e) {
    console.error('submitBatchPublish error:', e)
    ElMessage.error(t('common.pxm_publish_submit_failed'))
  } finally {
    submitting.value = false
  }
}

/** h. 单行直接发布（已驳回/已下架） */
const singlePublish = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_publish'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return submitWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_apply'))
      resetTableData()
    })
    .catch(() => {})
}

/** f. 已上架 - 提交更新 */
const handleUpdate = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_update'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return submitWorkUpdateApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_update'))
      resetTableData()
    })
    .catch(() => {})
}

// ========== 弹窗草稿列表（可发布作品） ==========

// ========== 弹窗草稿列表（可发布作品） ==========
const resourceDialogVisible = ref(false)
const searchDraftKey = ref('')
const draftWorkList = ref([])
const selectedDraftId = ref('')

// 搜索防抖定时器
let searchTimer = null

// 滚动加载分页
const draftPage = ref(1)
const draftPageSize = ref(20)
const draftTotal = ref(0)
const draftLoadingMore = ref(false)

const draftNoMore = computed(() => {
  return draftWorkList.value.length >= draftTotal.value && draftTotal.value > 0
})

/** 加载弹窗草稿列表（首屏/搜索） */
async function loadDraftWorkList() {
  try {
    draftPage.value = 1
    draftTotal.value = 0
    selectedDraftId.value = ''
    const res = await pageReleaseCandidatesApi({
      pageNumber: 1,
      pageSize: draftPageSize.value,
      keyword: searchDraftKey.value.trim() || undefined,
    })
    const pageData = (res.result || {}).list || []
    draftTotal.value = (res.result || {}).total || pageData.length
    draftWorkList.value = pageData.map((api) => ({
      id: api.id,
      name: api.title,
      coverUrl: api.coverUrl || '',
      updatedAt: formatDate(api.updateTime),
    }))
  } catch (e) {
    console.error('loadDraftWorkList error:', e)
    ElMessage.error(t('common.pxm_publish_action_failed'))
  }
}

/** 滚动加载更多 */
async function loadMoreDrafts() {
  if (draftLoadingMore.value || draftNoMore.value) return
  try {
    draftLoadingMore.value = true
    const nextPage = draftPage.value + 1
    const res = await pageReleaseCandidatesApi({
      pageNumber: nextPage,
      pageSize: draftPageSize.value,
      keyword: searchDraftKey.value.trim() || undefined,
    })
    const pageData = (res.result || {}).list || []
    draftTotal.value = res.result?.total ?? draftTotal.value
    const newItems = pageData.map((api) => ({
      id: api.id,
      name: api.title,
      coverUrl: api.coverUrl || '',
      updatedAt: formatDate(api.updateTime),
    }))
    draftWorkList.value.push(...newItems)
    draftPage.value = nextPage
  } catch (e) {
    console.error('loadMoreDrafts error:', e)
  } finally {
    draftLoadingMore.value = false
  }
}

/** 选择作品（单选） */
function selectDraftWork(item) {
  selectedDraftId.value = item.id
}

// ========== 状态映射工具函数 ==========
const statusMap = {
  all: t('common.pxm_publish_all_statuses'),
  reviewing: t('common.pxm_publish_status_pending'),
  published: t('common.pxm_publish_status_live'),
  rejected: t('common.pxm_publish_status_rejected'),
  offline: t('common.pxm_publish_status_offline'),
  draft: t('common.pxm_publish_status_offline'),
}
const getStatusLabel = (val) => statusMap[val] || val
const getStatusTagType = (status) => {
  const map = {
    reviewing: 'warning',
    published: 'success',
    live: 'success',
    rejected: 'danger',
    offline: 'info',
    draft: 'info',
    pending: 'warning',
  }
  return map[status] || ''
}

/** f. 已上架 - 下架 */
const handleUnpublish = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_unpublish'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return unpublishWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_unpublish'))
      resetTableData()
    })
    .catch(() => {})
}

/** g. 审核中 - 撤回 */
const handleWithdraw = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_withdraw'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return withdrawWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_withdraw'))
      resetTableData()
    })
    .catch(() => {})
}

/** i. 已下架 - 删除作品 */
const handleDelete = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_delete'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'error',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return removeFromReleasesApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_delete_success'))
      resetTableData()
    })
    .catch(() => {})
}

/** 搜索防抖：输入停止 300ms 后触发 */
function handleSearchDraft() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadDraftWorkList()
  }, 300)
}

onMounted(() => {
  // loadStatsData()
  loadTableDataInitial()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.content {
  padding: 24px;
  background-color: #ffffff;
  height: 100vh;
  overflow-y: hidden;
  box-sizing: border-box;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.topbar h1 {
  font-size: 22px;
  margin: 0 0 4px;
}
.topbar p {
  color: #666;
  margin: 0;
}
.community-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.stat-card strong {
  display: block;
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 8px;
}
.stat-card span {
  color: #777;
}
.community-section {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}
.community-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.community-section-head h2 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
  flex-shrink: 0;
}
.community-status-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.community-status-filter :deep(.el-select) {
  min-width: 150px;
}
.publish-name {
  height: 80px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.publish-name img{
  /* Firefox旧版本兼容 */
  image-rendering: -moz-crisp-edges;
  /* Safari 旧版兼容 */
  image-rendering: -webkit-optimize-contrast;
  /* 标准 */
  image-rendering: crisp-edges;
  /* Chrome/Edge像素渲染兜底 */
  image-rendering: pixelated;
}

.publish-thumb {
  width: 128px;
  height: 64px;
  background: #222;
  border-radius: 6px;
  flex-shrink: 0;
}
.publish-thumb.small {
  width: 44px;
  height: 44px;
}
.publish-name h3 {
  margin: 0 0 4px;
  font-size: 15px;
}
.reject-tip {
  color: #e04444;
  font-size: 12px;
  display: block;
  line-height: 1.4;
}
.publish-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ========== 草稿列表卡片网格：每行固定 3 个 ========== */
.publish-card-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 8px;
}
.publish-card-list::-webkit-scrollbar {
  width: 6px;
}
.publish-card-list::-webkit-scrollbar-thumb {
  background: #d0d7e2;
  border-radius: 3px;
}
.publish-card-list::-webkit-scrollbar-thumb:hover {
  background: #b8c4d8;
}
.publish-work-card {
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
}
.publish-work-card:hover {
  border-color: #b3d4fc;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.18);
  transform: translateY(-2px);
}
.publish-work-card.selected {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.35);
  background-color: #f0f7ff;
}
.publish-card-image-wrap {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: #e8ecf0;
  overflow: hidden;
}
.publish-card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.publish-card-body {
  padding: 12px 14px 14px;
}
.publish-card-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}
.publish-card-time {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* scoped下需要深度选择器 */
:deep(.black-btn) {
  background-color: #000 !important;
  border-color: #000 !important;
}

.dialog-footer-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.footer-left-text {
  color: #666;
  font-size: 13px;
  line-height: 1.5;
  flex-shrink: 1; /* 文字区域自适应压缩，不挤压按钮 */
}

.footer-btn-group {
  display: flex;
  gap: 12px; /* 按钮之间固定间距 */
  flex-shrink: 0; /* 按钮区域不压缩 */
}

/* 头部布局：左右并排，垂直居中 */
.dialog-header-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 主标题加粗，保持原生弹窗标题样式 */
.dialog-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

/* 右侧说明文本样式，可自行调整颜色大小 */
.header-desc {
  padding: 2px 10px;
  color: #909399;
  background: #f3f3f3;
  font-size: 13px;
}

/* ========== 发布管理表格无限滚动 ========== */
.publish-table-wrap {
  position: relative;
}
.infinite-loading-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}

img {
   /* 关闭平滑线性插值，启用锐利渲染 */
  image-rendering: crisp-edges;
  /* Chrome/Edge 兼容像素化放大 */
  image-rendering: pixelated;
  /* 兼容旧版 Safari */
  image-rendering: -webkit-optimize-contrast;
}

/* ========== 步骤内容区 ========== */
.dialog-step-content {
  min-height: 400px;
}

/* -------- 步骤2：标签选择（左预览 + 右标签） -------- */
.tag-step-layout {
  display: flex;
  gap: 32px;
  min-height: 440px;
}

.tag-step-preview {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image-wrap {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: #f0f2f5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.preview-image {
  width: 100%;
  display: block;
}

.preview-title {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  text-align: center;
}

.tag-step-list {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tag-step-heading {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #303133;
}

.tag-loading-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}

.tag-empty {
  padding: 40px 0;
}

.tag-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-chip {
  cursor: pointer;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.2s;
}

.tag-chip:hover {
  transform: scale(1.05);
}

/* -------- 步骤3：提交确认 -------- */
/* ========== 步骤3：成功确认卡片 ========== */
.publish-success-step {
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  background: #f8fafc;
}

.publish-success-card {
  width: min(520px, 100%);
  border: 1px solid #e8eef6;
  border-radius: 16px;
  background: #fff;
  padding: 34px;
  text-align: center;
  box-shadow: 0 16px 44px #0f172a14;
}

.publish-success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  border-radius: 999px;
  background: #e8f7ef;
  color: #17a05d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.publish-success-card h3 {
  margin: 0;
  color: #202124;
  font-size: 20px;
  font-weight: 700;
}

.publish-success-card p {
  margin: 10px 0 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
}

.publish-success-card dl {
  margin: 24px 0 0;
  display: grid;
  gap: 10px;
  text-align: left;
}

.publish-success-card dl div {
  display: grid;
  grid-template-columns: 92px 1fr;
  align-items: center;
  gap: 14px;
  border-radius: 10px;
  background: #f8fafc;
  padding: 12px 14px;
}

.publish-success-card dt {
  color: #8b8f98;
  font-size: 12px;
  font-weight: 600;
}

.publish-success-card dd {
  margin: 0;
  color: #202124;
  font-size: 13px;
  font-weight: 700;
}

/* ========== 步骤条 ========== */
.publish-steps {
  display: grid;
  grid-template-columns: max-content 1fr max-content 1fr max-content;
  align-items: center;
  gap: 16px;
  padding: 16px 32px;
  border-bottom: 1px solid #eeeeee;
}

.publish-steps span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8b8f98;
  font-size: 13px;
  font-weight: 600;
}

.publish-steps strong {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #f0f2f5;
  color: #8b8f98;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.publish-steps span.active,
.publish-steps span.done {
  color: #202124;
}

.publish-steps span.active strong,
.publish-steps span.done strong {
  background: #2d7ff9;
  color: #fff;
}

.publish-steps i {
  height: 1px;
  background: #e3e5e8;
}

/* ========== 步骤2：分类选择 ========== */
.category-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

/* 左侧：已选作品摘要 */
.selected-work-summary {
  min-width: 0;
  border: 1px solid #e8eef6;
  border-radius: 14px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 10px 30px #0f172a0d;
}

.selected-work-summary h3 {
  margin: 14px 0 0;
  color: #202124;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-work-summary p {
  margin: 6px 0 0;
  color: #8b8f98;
  font-size: 12px;
}

/* 暗色流式预览 */
.preview-dark-flow {
  background: #1a1d2e;
  border-radius: 12px;
  height: 160px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 右侧：分类面板 */
.category-panel {
  max-width: none;
  border: 1px solid #e8eef6;
  border-radius: 14px;
  background: #fff;
  padding: 26px;
  box-shadow: 0 10px 30px #0f172a0d;
}

.category-panel h3 {
  margin: 0;
  color: #202124;
  font-size: 15px;
  font-weight: 700;
}

.category-panel p {
  margin: 8px 0 0;
  color: #8a9ab0;
  font-size: 13px;
}

.category-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 22px;
}

.category-options button {
  min-width: 72px;
  height: 38px;
  border: 1px solid #d8e3f2;
  border-radius: 999px;
  background: #fff;
  color: #57708f;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.category-options button:hover {
  border-color: #2d7ff9;
  color: #1f6fe5;
}

.category-options button.selected {
  border-color: #2d7ff9;
  background: #eaf3ff;
  color: #1f6fe5;
}
</style>
