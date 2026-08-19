<template>
  <el-select
    class="product-selector"
    :model-value="productStore.current?.id"
    :loading="productStore.loading"
    filterable
    placeholder="选择产品"
    @change="handleChange"
  >
    <el-option
      v-for="product in productStore.products"
      :key="product.id"
      :label="product.name"
      :value="product.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted } from "vue"
import { useProductStore } from "@/stores/product"
import "./product-selector.scss"

const emit = defineEmits<{
  change: [productId: string]
}>()

const productStore = useProductStore()

onMounted(() => {
  productStore.loadProducts()
})

async function handleChange(productId: string) {
  await productStore.selectProduct(productId)
  emit("change", productId)
}
</script>
