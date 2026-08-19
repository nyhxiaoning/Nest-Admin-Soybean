import { Plus, Refresh } from "@element-plus/icons-vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { defineComponent, onMounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { deleteProductApi, pageProductsApi, releaseProductApi, type ProductQuery } from "@/api/product"
import ProductCreateDrawer from "@/modules/product/components/ProductCreateDrawer.vue"
import PageHeader from "@/shared/components/PageHeader.vue"
import type { Product } from "@/shared/types"
import { formatTime } from "@/shared/format"

const defaultQuery = {
  pageNumber: 1,
  pageSize: 20,
  search: "",
  status: ""
}

const listCache = {
  loaded: false,
  rows: [] as Product[],
  total: 0,
  query: { ...defaultQuery } as ProductQuery
}

export default defineComponent({
  name: "ProductList",
  components: { PageHeader, ProductCreateDrawer },
  setup() {
    const router = useRouter()
    const loading = ref(!listCache.loaded)
    const createVisible = ref(false)
    const editingProductId = ref("")
    const rows = ref<Product[]>([...listCache.rows])
    const total = ref(listCache.total)
    const query = reactive<ProductQuery>({ ...listCache.query })

    onMounted(() => {
      if (!listCache.loaded) {
        loadProducts()
      }
    })

    function openCreate() {
      editingProductId.value = ""
      createVisible.value = true
    }

    function openEdit(row: Product) {
      editingProductId.value = row.id
      createVisible.value = true
    }

    function openDetail(row: Product) {
      router.push(`/product/${row.id}`)
    }

    async function loadProducts() {
      loading.value = true
      try {
        const { result } = await pageProductsApi(query)
        rows.value = result?.list || []
        total.value = result?.total || 0
        listCache.loaded = true
        listCache.rows = [...rows.value]
        listCache.total = total.value
        listCache.query = { ...query }
      } finally {
        loading.value = false
      }
    }

    function handleSearch() {
      query.pageNumber = 1
      loadProducts()
    }

    function handleReset() {
      query.search = ""
      query.status = ""
      handleSearch()
    }

    function handleSizeChange() {
      query.pageNumber = 1
      loadProducts()
    }

    async function handleRelease(row: Product) {
      try {
        await ElMessageBox.confirm(`确认发布产品「${row.name || row.code}」吗？`, "发布产品", {
          type: "warning",
          confirmButtonText: "发布",
          cancelButtonText: "取消"
        })
        await releaseProductApi(row.id)
        ElMessage.success("发布成功")
        listCache.loaded = false
        loadProducts()
      } catch {
        // 用户取消发布时不需要提示。
      }
    }

    async function handleDelete(row: Product) {
      try {
        await ElMessageBox.confirm(`确认删除产品「${row.name || row.code}」吗？`, "删除产品", {
          type: "warning",
          confirmButtonText: "删除",
          cancelButtonText: "取消"
        })
        await deleteProductApi(row.id)
        ElMessage.success("删除成功")
        listCache.loaded = false
        loadProducts()
      } catch {
        // 用户取消删除时不需要提示。
      }
    }

    return {
      Plus,
      Refresh,
      loading,
      createVisible,
      editingProductId,
      rows,
      total,
      query,
      formatTime,
      openCreate,
      openEdit,
      openDetail,
      loadProducts,
      handleSearch,
      handleReset,
      handleSizeChange,
      handleRelease,
      handleDelete
    }
  }
})
