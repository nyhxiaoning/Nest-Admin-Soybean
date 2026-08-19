<template>
  <section>
    <PageHeader
      title="产品详情"
      description="查看产品基础资料、配网信息和引导步骤。"
      :breadcrumbs="breadcrumbs"
    />

    <div v-loading="loading" class="detail-stack">
      <div class="page-card">
        <div class="detail-title">基础信息</div>
        <div class="product-summary">
          <el-image class="product-image" fit="cover" :src="detail?.fullUrl || detail?.url">
            <template #error>
              <div class="image-empty">暂无图片</div>
            </template>
          </el-image>
          <div class="detail-grid">
            <div class="detail-item"><span>产品名称</span><strong>{{ detail?.name || "--" }}</strong></div>
            <div class="detail-item"><span>产品编号</span><strong>{{ detail?.code || "--" }}</strong></div>
            <div class="detail-item"><span>Tal ID</span><strong>{{ detail?.talId || "--" }}</strong></div>
            <div class="detail-item"><span>产品分类</span><strong>{{ detail?.categoryName || "--" }}</strong></div>
            <div class="detail-item">
              <span>通信模组</span><strong>{{ detail?.communicationModuleName || detail?.communicationModule || "--" }}</strong>
            </div>
            <div class="detail-item">
              <span>状态</span><strong>{{ detail?.status === "PUBLISHED" ? "已发布" : "未发布" }}</strong>
            </div>
            <div class="detail-item"><span>更新时间</span><strong>{{ formatTime(detail?.updateTime) }}</strong></div>
          </div>
        </div>
      </div>

      <div class="page-card">
        <div class="detail-title">配网信息</div>
        <div class="detail-grid detail-grid--network">
          <div class="detail-item"><span>最低冒泡版本(iOS)</span><strong>{{ detail?.network?.minIosVersion || "--" }}</strong></div>
          <div class="detail-item">
            <span>最低冒泡版本(Android)</span><strong>{{ detail?.network?.minAndroidVersion || "--" }}</strong>
          </div>
          <div class="detail-item detail-item--wide">
            <span>配网说明</span>
            <div v-if="networkTexts.length" class="language-list">
              <div v-for="item in networkTexts" :key="item.key" class="language-item">
                <em>{{ item.label }}</em>
                <strong class="multiline-text">{{ item.text }}</strong>
              </div>
            </div>
            <strong v-else>--</strong>
          </div>
        </div>

        <div class="media-section">
          <div class="media-title">引导图列表</div>
          <div v-if="guideUrls.length" class="image-list">
            <el-image v-for="item in guideUrls" :key="item" class="media-image" fit="cover" :src="item" />
          </div>
          <el-empty v-else description="暂无引导图" />
        </div>
      </div>

      <div class="page-card">
        <div class="detail-title">产品引导步骤</div>
        <div v-if="detail?.guideSteps?.length" class="step-list">
          <div v-for="(step, index) in detail.guideSteps" :key="`${step.stepNo || index}-${step.stepImgUrl || ''}`" class="step-item">
            <el-image class="step-image" fit="cover" :src="step.stepImgFullUrl || step.stepImgUrl" />
            <div class="step-content">
              <span>步骤 {{ step.stepNo }}</span>
              <div v-if="guideStepTexts(step.translations, step.title, step.text).length" class="language-list">
                <div
                  v-for="item in guideStepTexts(step.translations, step.title, step.text)"
                  :key="item.key"
                  class="language-item"
                >
                  <em>{{ item.label }}</em>
                  <strong v-if="item.title">{{ item.title }}</strong>
                  <p v-if="item.text" class="multiline-text">{{ item.text }}</p>
                </div>
              </div>
              <p v-else>--</p>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无引导步骤" />
      </div>
    </div>
  </section>
</template>

<script lang="ts" src="./detail.ts"></script>
<style scoped lang="scss" src="./detail.scss"></style>
