import type { Product } from "@/shared/types"
import { defineStore } from "pinia"
import { listProductsApi, selectProductApi } from "@/api/product"

const SELECTED_PRODUCT_KEY = "bubble-device-admin:selected-product-id"

export const useProductStore = defineStore("product", {
  state: () => ({
    products: [] as Product[],
    current: null as Product | null,
    loading: false,
    loaded: false
  }),
  actions: {
    async loadProducts(force = false) {
      if (this.loaded && !force) {
        return
      }
      this.loading = true
      try {
        const { result: products } = await listProductsApi()
        this.products = products || []
        const selectedId = readSelectedProductId() || this.current?.id
        this.current = this.products.find((product) => product.id === selectedId) || this.products[0] || null
        rememberSelectedProduct(this.current?.id)
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    async selectProduct(productId: string) {
      const { result } = await selectProductApi(productId)
      this.current = result
      rememberSelectedProduct(result?.id || productId)
    }
  }
})

function readSelectedProductId() {
  return sessionStorage.getItem(SELECTED_PRODUCT_KEY) || ""
}

function rememberSelectedProduct(productId?: string) {
  if (productId) {
    sessionStorage.setItem(SELECTED_PRODUCT_KEY, productId)
  } else {
    sessionStorage.removeItem(SELECTED_PRODUCT_KEY)
  }
}
