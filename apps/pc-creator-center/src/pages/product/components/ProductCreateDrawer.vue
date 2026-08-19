<template>
  <el-drawer v-model="visible" :title="drawerTitle" size="860px" @closed="resetForm">
    <el-form ref="formRef" class="product-create-form" label-width="112px" :model="form" :rules="rules">
      <section class="form-section">
        <h3>基础信息</h3>
        <div class="form-grid form-grid--basic">
          <el-form-item label="产品名称" prop="name">
            <el-input v-model.trim="form.name" maxlength="60" placeholder="请输入产品名称" show-word-limit />
          </el-form-item>
          <el-form-item label="产品分类" prop="categoryId">
            <el-select v-model="form.categoryId" :disabled="isPublishedEdit" filterable placeholder="请选择产品分类">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="Tal ID" prop="talId">
            <el-select
              v-model.trim="form.talId"
              allow-create
              clearable
              :disabled="isPublishedEdit"
              filterable
              placeholder="可搜索选择、手动填写；留空由后端生成"
            >
              <el-option v-for="item in talIds" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="产品图片" required>
            <div class="upload-field">
              <el-upload
                accept="image/*"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleProductImageChange"
                :on-remove="handleProductImageRemove"
              >
                <el-button>选择图片</el-button>
              </el-upload>
              <div class="upload-tip">logo 图片需为 1:1 比例</div>
              <img v-if="productImagePreview" alt="产品图片预览" class="image-preview image-preview--square" :src="productImagePreview" />
            </div>
          </el-form-item>
        </div>
      </section>

      <section class="form-section">
        <h3>配网信息</h3>
        <div class="form-grid form-grid--network">
          <el-form-item class="version-field" label="最低冒泡版本(iOS)" prop="minIosVersion">
            <el-input v-model.trim="form.minIosVersion" placeholder="例如 1.0.0" />
          </el-form-item>
          <el-form-item class="version-field" label="最低冒泡版本(Android)" prop="minAndroidVersion">
            <el-input v-model.trim="form.minAndroidVersion" placeholder="例如 1.0.0" />
          </el-form-item>
        </div>

        <el-form-item label="引导图列表" required>
          <div class="upload-field">
            <el-upload
              accept="image/*"
              :auto-upload="false"
              multiple
              :show-file-list="false"
              :on-change="handleGuideImageChange"
            >
              <el-button>选择图片</el-button>
            </el-upload>
            <div class="upload-tip">配网引导图大致比例为高 248 / 宽 343，可尝试 4:3 或 16:9</div>
            <div v-if="guideImages.length" class="preview-list">
              <div v-for="(item, imageIndex) in guideImages" :key="item.id" class="preview-item">
                <img alt="引导图预览" class="image-preview" :src="item.preview" />
                <el-button class="preview-remove" text type="danger" @click="removeGuideImage(imageIndex)">删除</el-button>
              </div>
            </div>
          </div>
        </el-form-item>

        <div class="i18n-panel">
          <div class="i18n-title">配网说明文案（中文必填）</div>
          <el-tabs v-model="networkLang">
            <el-tab-pane v-for="lang in languages" :key="lang.key" :label="lang.label" :name="lang.key">
              <el-input
                v-model="form.networkTexts[lang.key]"
                maxlength="500"
                :placeholder="lang.networkPlaceholder"
                show-word-limit
                type="textarea"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </section>

      <section class="form-section">
        <div class="section-title-row">
          <h3>产品引导步骤</h3>
          <el-button :icon="Plus" @click="addStep">添加步骤</el-button>
        </div>

        <el-empty v-if="!form.guideSteps.length" description="还没有引导步骤" />

        <div v-for="(step, index) in form.guideSteps" :key="step.id" class="step-card">
          <div class="step-card__header">
            <span>步骤 {{ index + 1 }}</span>
            <div>
              <el-button :disabled="index === 0" text @click="moveStep(index, -1)">上移</el-button>
              <el-button :disabled="index === form.guideSteps.length - 1" text @click="moveStep(index, 1)">下移</el-button>
              <el-button text type="danger" @click="removeStep(index)">删除</el-button>
            </div>
          </div>

          <el-form-item label="步骤图片" required>
            <div class="upload-field">
              <el-upload
                accept="image/*"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="createStepImageChangeHandler(index)"
                :on-remove="createStepImageRemoveHandler(index)"
              >
                <el-button>选择图片</el-button>
              </el-upload>
              <div class="upload-tip">配网成功 gif 大致比例为高 310 / 宽 315，可尝试 1:1</div>
              <img v-if="step.imagePreview" alt="步骤图片预览" class="image-preview" :src="step.imagePreview" />
            </div>
          </el-form-item>

          <div class="step-i18n-panel">
            <div class="i18n-title">步骤文案（中文必填）</div>
            <el-tabs v-model="step.lang">
              <el-tab-pane v-for="lang in languages" :key="lang.key" :label="lang.label" :name="lang.key">
                <template v-if="lang.key === 'zh-CN'">
                  <el-form-item label="步骤标题" required>
                    <el-input v-model.trim="step.title" maxlength="80" :placeholder="lang.titlePlaceholder" show-word-limit />
                  </el-form-item>
                  <el-form-item label="步骤内容" required>
                    <el-input
                      v-model="step.text"
                      maxlength="200"
                      :placeholder="lang.textPlaceholder"
                      show-word-limit
                      type="textarea"
                    />
                  </el-form-item>
                </template>
                <template v-else>
                  <el-form-item label="步骤标题">
                    <el-input
                      v-model.trim="step.translations[lang.key].title"
                      maxlength="80"
                      :placeholder="lang.titlePlaceholder"
                      show-word-limit
                    />
                  </el-form-item>
                  <el-form-item label="步骤内容">
                    <el-input
                      v-model="step.translations[lang.key].text"
                      maxlength="200"
                      :placeholder="lang.textPlaceholder"
                      show-word-limit
                      type="textarea"
                    />
                  </el-form-item>
                </template>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </section>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button :loading="submitting" type="primary" @click="submit">{{ drawerTitle }}</el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" src="./product-create-drawer.ts"></script>
<style scoped lang="scss" src="./product-create-drawer.scss"></style>
