import type { CommunicationModule, CreateProductRequest, ProductDetail } from "@/api/product"
import type { ProductCategory } from "@/shared/types"
import type { FormInstance, FormRules, UploadFile } from "element-plus"
import { Plus } from "@element-plus/icons-vue"
import { ElMessage } from "element-plus"
import { computed, defineComponent, reactive, ref, watch } from "vue"
import {
  createProductApi,
  getProductDetailApi,
  listProductCategoriesApi,
  listProductTalIdsApi,
  updateProductApi,
  uploadProductFileApi
} from "@/api/product"

type LangKey = "zh-CN" | "en" | "ja"

const DEFAULT_COMMUNICATION_MODULE: CommunicationModule = "WIFI_BLUETOOTH"
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

interface I18nText {
  title: string
  text: string
}

interface GuideStepForm {
  id: number
  imageFile?: File
  imageValue?: string
  imagePreview?: string
  title: string
  text: string
  translations: Record<LangKey, I18nText>
  lang: LangKey
}

interface GuideImageForm {
  id: number
  value?: string
  file?: File
  preview: string
}

const languages: Array<{
  key: LangKey
  label: string
  networkPlaceholder: string
  titlePlaceholder: string
  textPlaceholder: string
}> = [
  {
    key: "zh-CN",
    label: "中文",
    networkPlaceholder: "请输入中文配网说明",
    titlePlaceholder: "请输入中文标题",
    textPlaceholder: "请输入中文正文"
  },
  {
    key: "en",
    label: "English",
    networkPlaceholder: "Enter setup guide text",
    titlePlaceholder: "Enter step title",
    textPlaceholder: "Enter step text"
  },
  {
    key: "ja",
    label: "日本語",
    networkPlaceholder: "日本語の設定ガイドを入力",
    titlePlaceholder: "タイトルを入力",
    textPlaceholder: "本文を入力"
  }
]

function createLangText(): Record<LangKey, I18nText> {
  return {
    "zh-CN": { title: "", text: "" },
    en: { title: "", text: "" },
    ja: { title: "", text: "" }
  }
}

function createNetworkTexts(): Record<LangKey, string> {
  return {
    "zh-CN": "",
    en: "",
    ja: ""
  }
}

export default defineComponent({
  name: "ProductCreateDrawer",
  props: {
    modelValue: { type: Boolean, default: false },
    productId: { type: String, default: "" }
  },
  emits: ["update:modelValue", "success"],
  setup(props, { emit }) {
    const formRef = ref<FormInstance>()
    const categories = ref<ProductCategory[]>([])
    const talIds = ref<string[]>([])
    const submitting = ref(false)
    const networkLang = ref<LangKey>("zh-CN")
    const productStatus = ref<ProductDetail["status"]>()
    const productImageFile = ref<File>()
    const productImageValue = ref("")
    const productImagePreview = ref("")
    const guideImages = ref<GuideImageForm[]>([])
    let stepSeed = 1
    let guideImageSeed = 1

    const isEdit = computed(() => Boolean(props.productId))
    const isPublishedEdit = computed(() => isEdit.value && productStatus.value === "PUBLISHED")
    const drawerTitle = computed(() => (isEdit.value ? "保存" : "保存"))

    const visible = computed({
      get: () => props.modelValue,
      set: (value: boolean) => emit("update:modelValue", value)
    })

    const form = reactive({
      name: "",
      categoryId: "",
      talId: "",
      minIosVersion: "",
      minAndroidVersion: "",
      networkTexts: createNetworkTexts(),
      guideSteps: [] as GuideStepForm[]
    })

    const rules: FormRules = {
      name: [{ required: true, message: "请输入产品名称", trigger: "blur" }],
      categoryId: [{ required: true, message: "请选择产品分类", trigger: "change" }],
      minIosVersion: [{ validator: validateVersion, trigger: "blur" }],
      minAndroidVersion: [{ validator: validateVersion, trigger: "blur" }]
    }

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          loadCategories()
          loadTalIds()
          if (props.productId) {
            loadProductDetail()
          } else if (!form.guideSteps.length) {
            addStep()
          }
        }
      }
    )

    async function loadCategories() {
      const { result } = await listProductCategoriesApi()
      categories.value = result || []
    }

    async function loadTalIds() {
      const { result } = await listProductTalIdsApi()
      talIds.value = result || []
    }

    async function loadProductDetail() {
      const { result } = await getProductDetailApi(props.productId)
      fillForm(result)
    }

    function fillForm(detail: ProductDetail) {
      resetFormState()
      form.name = detail.name || ""
      productStatus.value = detail.status
      form.categoryId = detail.categoryId || ""
      form.talId = detail.talId || ""
      productImageValue.value = detail.url || ""
      productImagePreview.value = detail.fullUrl || detail.url || ""

      const network = detail.network
      form.minIosVersion = network?.minIosVersion || ""
      form.minAndroidVersion = network?.minAndroidVersion || ""
      form.networkTexts = parseNetworkTexts(network?.translations, network?.setupGuide?.stepText)
      guideImages.value =
        network?.setupGuide?.guideUrl?.map((item) => ({
          id: guideImageSeed++,
          value: item,
          preview: item
        })) || []
      form.guideSteps =
        detail.guideSteps?.length
          ? detail.guideSteps.map((step) => {
              const translations = parseStepTranslations(step.translations, step.title, step.text)
              return {
                id: stepSeed++,
                imageValue: step.stepImgUrl || "",
                imagePreview: step.stepImgFullUrl || step.stepImgUrl || "",
                title: translations["zh-CN"].title,
                text: translations["zh-CN"].text,
                translations,
                lang: "zh-CN" as LangKey
              }
            })
          : []
      if (!form.guideSteps.length) {
        addStep()
      }
    }

    async function handleProductImageChange(uploadFile: UploadFile) {
      if (!uploadFile.raw) {
        return
      }
      const valid = await validateSquareImage(uploadFile.raw)
      if (!valid) {
        ElMessage.warning("产品 logo 图片需为 1:1 比例")
        clearSelectedProductImage()
        return
      }
      productImageFile.value = uploadFile.raw
      productImagePreview.value = replacePreview(productImagePreview.value, uploadFile.raw)
    }

    function handleProductImageRemove() {
      clearSelectedProductImage()
      productImageValue.value = ""
      productImagePreview.value = ""
    }

    function clearSelectedProductImage() {
      productImageFile.value = undefined
      if (productImagePreview.value.startsWith("blob:")) {
        productImagePreview.value = revokePreview(productImagePreview.value)
      } else if (productImageValue.value) {
        productImagePreview.value = productImagePreview.value || productImageValue.value
      } else {
        productImagePreview.value = ""
      }
    }

    function handleGuideImageChange(uploadFile: UploadFile) {
      if (!uploadFile.raw) {
        return
      }
      if (guideImages.value.length >= 6) {
        ElMessage.warning("配网引导图最多上传 6 张")
        return
      }
      guideImages.value.push({
        id: guideImageSeed++,
        file: uploadFile.raw,
        preview: URL.createObjectURL(uploadFile.raw)
      })
    }

    function removeGuideImage(index: number) {
      const [image] = guideImages.value.splice(index, 1)
      if (image?.file) {
        revokePreview(image.preview)
      }
    }

    function handleStepImageChange(index: number, uploadFile: UploadFile) {
      form.guideSteps[index].imageFile = uploadFile.raw
      form.guideSteps[index].imageValue = ""
      form.guideSteps[index].imagePreview = replacePreview(form.guideSteps[index].imagePreview || "", uploadFile.raw)
    }

    function handleStepImageRemove(index: number) {
      form.guideSteps[index].imageFile = undefined
      form.guideSteps[index].imageValue = ""
      form.guideSteps[index].imagePreview = revokePreview(form.guideSteps[index].imagePreview || "")
    }

    function createStepImageChangeHandler(index: number) {
      return (uploadFile: UploadFile) => handleStepImageChange(index, uploadFile)
    }

    function createStepImageRemoveHandler(index: number) {
      return () => handleStepImageRemove(index)
    }

    function replacePreview(current: string, file?: File) {
      revokePreview(current)
      return file ? URL.createObjectURL(file) : ""
    }

    function revokePreview(url: string) {
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url)
      }
      return ""
    }

    function validateSquareImage(file: File) {
      return new Promise<boolean>((resolve) => {
        const url = URL.createObjectURL(file)
        const image = new Image()
        image.onload = () => {
          const valid = image.naturalWidth === image.naturalHeight
          URL.revokeObjectURL(url)
          resolve(valid)
        }
        image.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(false)
        }
        image.src = url
      })
    }

    function validateVersion(_: unknown, value: string, callback: (error?: Error) => void) {
      if (!value || VERSION_PATTERN.test(value)) {
        callback()
        return
      }
      callback(new Error("版本格式为 0.0.0，仅支持数字"))
    }

    function addStep() {
      form.guideSteps.push({
        id: stepSeed++,
        title: "",
        text: "",
        translations: createLangText(),
        lang: "zh-CN"
      })
    }

    function removeStep(index: number) {
      revokePreview(form.guideSteps[index].imagePreview || "")
      form.guideSteps.splice(index, 1)
    }

    function moveStep(index: number, direction: -1 | 1) {
      const target = index + direction
      const current = form.guideSteps[index]
      form.guideSteps.splice(index, 1)
      form.guideSteps.splice(target, 0, current)
    }

    async function uploadFile(file?: File) {
      if (!file) {
        return { path: "", url: "" }
      }
      const { result } = await uploadProductFileApi(file)
      return {
        path: result.filePath || "",
        url: result.url || result.fileUrl || result.filePath || ""
      }
    }

    function buildNetworkTranslations() {
      const translations = languages.reduce<Record<string, string>>((result, lang) => {
        const text = safeTrim(form.networkTexts[lang.key])
        if (text) {
          result[lang.key] = text
        }
        return result
      }, {})
      return Object.keys(translations).length ? JSON.stringify(translations) : undefined
    }

    function parseNetworkTexts(translations?: string, fallback?: string) {
      const texts = createNetworkTexts()
      texts["zh-CN"] = fallback || ""
      const parsed = parseJson<Record<string, string | { text?: string }>>(translations, {})
      languages.forEach((lang) => {
        const value = parsed[lang.key]
        texts[lang.key] =
          (typeof value === "string" ? value : value?.text) || (lang.key === "zh-CN" ? fallback || "" : "")
      })
      return texts
    }

    function buildStepTranslations(step: GuideStepForm) {
      const translations = createLangText()
      translations["zh-CN"] = {
        title: safeTrim(step.title),
        text: safeTrim(step.text)
      }
      languages.forEach((lang) => {
        if (lang.key === "zh-CN") {
          return
        }
        translations[lang.key] = {
          title: safeTrim(step.translations[lang.key]?.title),
          text: safeTrim(step.translations[lang.key]?.text)
        }
      })
      const result = Object.entries(translations).reduce<Record<string, I18nText>>((acc, [key, value]) => {
        if (value.title || value.text) {
          acc[key] = value
        }
        return acc
      }, {})
      return Object.keys(result).length ? JSON.stringify(result) : undefined
    }

    function parseStepTranslations(translations?: string, fallbackTitle?: string, fallbackText?: string) {
      const texts = createLangText()
      texts["zh-CN"] = {
        title: fallbackTitle || "",
        text: fallbackText || fallbackTitle || ""
      }
      const parsed = parseJson<Record<string, I18nText>>(translations, {})
      languages.forEach((lang) => {
        texts[lang.key] = {
          title: parsed[lang.key]?.title || (lang.key === "zh-CN" ? fallbackTitle || "" : ""),
          text: parsed[lang.key]?.text || (lang.key === "zh-CN" ? fallbackText || fallbackTitle || "" : "")
        }
      })
      return texts
    }

    function parseJson<T>(value: string | undefined, fallback: T): T {
      if (!value) {
        return fallback
      }
      try {
        return JSON.parse(value) as T
      } catch {
        return fallback
      }
    }

    function safeTrim(value?: string | null) {
      return value?.trim() || ""
    }

    async function submit() {
      await formRef.value?.validate()
      if (!validatePayload()) {
        return
      }
      submitting.value = true
      try {
        const [productImage, uploadedGuideImages] = await Promise.all([
          uploadFile(productImageFile.value),
          Promise.all(guideImages.value.map((image) => uploadFile(image.file)))
        ])
        const stepImages = await Promise.all(form.guideSteps.map((step) => uploadFile(step.imageFile)))
        const networkText = safeTrim(form.networkTexts["zh-CN"])
        const guideUrls = guideImages.value
          .map((image, index) => uploadedGuideImages[index].url || image.value)
          .filter(Boolean) as string[]
        const data: CreateProductRequest = {
          name: safeTrim(form.name),
          categoryId: form.categoryId,
          talId: safeTrim(form.talId) || undefined,
          communicationModule: DEFAULT_COMMUNICATION_MODULE,
          url: productImage.path || productImageValue.value || undefined,
          networkCover: productImage.url || productImagePreview.value || undefined,
          network: {
            minIosVersion: safeTrim(form.minIosVersion) || undefined,
            minAndroidVersion: safeTrim(form.minAndroidVersion) || undefined,
            communicationModule: DEFAULT_COMMUNICATION_MODULE,
            setupGuide: {
              guideUrl: guideUrls,
              stepText: networkText || undefined
            },
            translations: buildNetworkTranslations()
          },
          guideSteps: form.guideSteps.map((step, index) => ({
            stepNo: index + 1,
            stepImgUrl: stepImages[index].url || step.imageValue || undefined,
            title: safeTrim(step.title),
            text: safeTrim(step.text),
            translations: buildStepTranslations(step)
          }))
        }
        if (isEdit.value) {
          await updateProductApi(props.productId, data)
          ElMessage.success("产品已更新")
        } else {
          await createProductApi(data)
          ElMessage.success("产品已创建")
        }
        visible.value = false
        emit("success")
      } finally {
        submitting.value = false
      }
    }

    function validatePayload() {
      if (!productImageFile.value && !productImageValue.value) {
        ElMessage.warning("请上传产品图片")
        return false
      }
      if (!guideImages.value.length) {
        ElMessage.warning("请至少上传一张配网引导图")
        return false
      }
      if (!safeTrim(form.networkTexts["zh-CN"])) {
        ElMessage.warning("请输入中文配网说明")
        networkLang.value = "zh-CN"
        return false
      }
      if (!form.guideSteps.length) {
        ElMessage.warning("请至少添加一个产品引导步骤")
        return false
      }
      for (let index = 0; index < form.guideSteps.length; index++) {
        const step = form.guideSteps[index]
        if (!step.imageFile && !step.imageValue) {
          ElMessage.warning(`请上传步骤 ${index + 1} 图片`)
          return false
        }
        if (!safeTrim(step.title)) {
          ElMessage.warning(`请输入步骤 ${index + 1} 标题`)
          step.lang = "zh-CN"
          return false
        }
        if (!safeTrim(step.text)) {
          ElMessage.warning(`请输入步骤 ${index + 1} 内容`)
          step.lang = "zh-CN"
          return false
        }
      }
      return true
    }

    function resetForm() {
      resetFormState()
      formRef.value?.clearValidate()
    }

    function resetFormState() {
      form.name = ""
      form.categoryId = ""
      form.talId = ""
      productStatus.value = undefined
      form.minIosVersion = ""
      form.minAndroidVersion = ""
      form.networkTexts = createNetworkTexts()
      form.guideSteps.forEach((step) => revokePreview(step.imagePreview || ""))
      form.guideSteps = []
      productImageFile.value = undefined
      productImageValue.value = ""
      productImagePreview.value = revokePreview(productImagePreview.value)
      guideImages.value.forEach((image) => {
        if (image.file) {
          revokePreview(image.preview)
        }
      })
      guideImages.value = []
      networkLang.value = "zh-CN"
    }

    return {
      Plus,
      visible,
      drawerTitle,
      formRef,
      form,
      rules,
      categories,
      talIds,
      languages,
      productImagePreview,
      guideImages,
      networkLang,
      isPublishedEdit,
      submitting,
      handleProductImageChange,
      handleProductImageRemove,
      handleGuideImageChange,
      removeGuideImage,
      handleStepImageChange,
      handleStepImageRemove,
      createStepImageChangeHandler,
      createStepImageRemoveHandler,
      addStep,
      removeStep,
      moveStep,
      submit,
      resetForm
    }
  }
})
