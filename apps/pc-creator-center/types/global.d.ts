/**
 * 全局类型声明
 */
declare global {
  // 通用 API 响应类型
  interface ApiResponse<T = any> {
    code: number
    message: string
    data: T
  }

  // 分页数据类型
  interface PaginationData<T = any> {
    list: T[]
    total: number
    page: number
    pageSize: number
  }

  // 表格列配置类型
  interface TableColumn {
    prop: string
    label: string
    width?: string | number
    minWidth?: string | number
    align?: 'left' | 'center' | 'right'
    sortable?: boolean
    formatter?: (row: any, column: any, cellValue: any) => string
  }
}

export {}