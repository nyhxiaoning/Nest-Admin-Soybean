import { computed, defineComponent, onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { getProductDetailApi, type ProductDetail } from "@/api/product"
import PageHeader from "@/shared/components/PageHeader.vue"
import { formatTime } from "@/shared/format"

type LangKey = "zh-CN" | "en" | "ja"

interface LangOption {
  key: LangKey
  label: string
}

interface I18nText {
  title?: string
  text?: string
}

interface DisplayText {
  key: LangKey
  label: string
  title?: string
  text: string
}

const languages: LangOption[] = [
  { key: "zh-CN", label: "中文" },
  { key: "en", label: "英文" },
  { key: "ja", label: "日文" }
]

export default defineComponent({
  name: "ProductDetail",
  components: { PageHeader },
  setup() {
    const route = useRoute()
    const loading = ref(false)
    const detail = ref<ProductDetail>()
    const breadcrumbs = [
      { label: "产品列表", to: "/product" },
      { label: "产品详情" }
    ]

    const networkTexts = computed(() => {
      const network = detail.value?.network
      return parseNetworkTexts(network?.translations, network?.setupGuide?.stepText)
    })

    const guideUrls = computed(() => detail.value?.network?.setupGuide?.guideUrl || [])

    onMounted(loadDetail)

    async function loadDetail() {
      loading.value = true
      try {
        const { result } = await getProductDetailApi(String(route.params.id))
        detail.value = result
      } finally {
        loading.value = false
      }
    }

    function parseNetworkTexts(translations?: string, fallback?: string) {
      const parsed = parseJson<Record<string, string | { text?: string }>>(translations, {})
      return languages
        .map((lang) => ({
          key: lang.key,
          label: lang.label,
          text: translationText(parsed[lang.key]) || (lang.key === "zh-CN" ? fallback || "" : "")
        }))
        .filter((item) => item.text)
    }

    function translationText(value?: string | { text?: string }) {
      return typeof value === "string" ? value : value?.text || ""
    }

    function guideStepTexts(translations?: string, fallbackTitle?: string, fallbackText?: string) {
      const parsed = parseJson<Record<string, I18nText>>(translations, {})
      return languages
        .map<DisplayText>((lang) => {
          const current = parsed[lang.key] || {}
          return {
            key: lang.key,
            label: lang.label,
            title: current.title || (lang.key === "zh-CN" ? fallbackTitle : ""),
            text: current.text || (lang.key === "zh-CN" ? fallbackText || "" : "")
          }
        })
        .filter((item) => item.title || item.text)
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

    return {
      breadcrumbs,
      loading,
      detail,
      networkTexts,
      guideUrls,
      guideStepTexts,
      formatTime
    }
  }
})
