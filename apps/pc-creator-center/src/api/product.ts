import type { PageQuery, PageResult, Product, ProductCategory, ProductGuideStep } from "@/shared/types"
import { request } from "@/http/request"

export type CommunicationModule =
  | "BLUETOOTH"
  | "WIFI"
  | "WIFI_BLUETOOTH"
  | "BLUETOOTH_MESH"
  | "OTHER"
  | "CELLULAR_4G"

export interface ProductQuery extends PageQuery {
  search?: string
  status?: string
  categoryId?: string
  communicationModule?: string
}

export interface ProductNetworkRequest {
  minIosVersion?: string
  minAndroidVersion?: string
  communicationModule?: CommunicationModule
  setupGuide?: {
    guideUrl?: string[]
    stepText?: string
  }
  translations?: string
}

export interface ProductGuideStepRequest {
  stepNo?: number
  stepImgUrl?: string
  title?: string
  text?: string
  translations?: string
}

export interface CreateProductRequest {
  name: string
  categoryId: string
  talId?: string
  communicationModule: CommunicationModule
  network?: ProductNetworkRequest
  guideSteps?: ProductGuideStepRequest[]
  url?: string
  networkCover?: string
}

export interface ProductDetail extends Product {
  fullUrl?: string
  networkCoverUrl?: string
  network?: ProductNetworkRequest
  guideSteps?: ProductGuideStep[]
}

export function pageProductsApi(params: ProductQuery) {
  return request<PageResult<Product>>({
    url: "/product/page",
    method: "get",
    params
  })
}

export function listProductsApi() {
  return request<Product[]>({
    url: "/product",
    method: "get",
    params: { status: "PUBLISHED" }
  })
}

export function listProductCategoriesApi() {
  return request<ProductCategory[]>({
    url: "/productCategory",
    method: "get"
  })
}

export function createProductApi(data: CreateProductRequest) {
  return request<Product>({
    url: "/product",
    method: "post",
    data
  })
}

export function getProductDetailApi(productId: string) {
  return request<ProductDetail>({
    url: `/product/${productId}/detail`,
    method: "get"
  })
}

export function updateProductApi(productId: string, data: CreateProductRequest) {
  return request<Product>({
    url: `/product/${productId}`,
    method: "put",
    data
  })
}

export function deleteProductApi(productId: string) {
  return request<void>({
    url: `/product/${productId}`,
    method: "delete"
  })
}

export function releaseProductApi(productId: string) {
  return request<Product>({
    url: `/product/${productId}/release`,
    method: "post"
  })
}

export function listProductTalIdsApi() {
  return request<string[]>({
    url: "/product/tal",
    method: "get"
  })
}

export function uploadProductFileApi(file: File) {
  const data = new FormData()
  data.append("file", file)
  return request<Record<string, string>>({
    url: "/product/file/img",
    method: "post",
    data,
    headers: { "Content-Type": "multipart/form-data" }
  })
}

export function getSelectedProductApi() {
  return request<Product | null>({
    url: "/product/user/select",
    method: "get"
  })
}

export function selectProductApi(productId: string) {
  return request<Product>({
    url: "/product/user/select",
    method: "put",
    data: { productId }
  })
}
