<template>
  <section>
    <PageHeader title="产品列表" description="查看当前管理账号可维护的产品。">
      <template #actions>
        <el-button :icon="Plus" type="primary" @click="openCreate">新增产品</el-button>
        <el-button :icon="Refresh" @click="loadProducts">刷新</el-button>
      </template>
    </PageHeader>

    <div class="page-card">
      <div class="toolbar">
        <el-input v-model.trim="query.search" clearable placeholder="产品名称/编号" @keyup.enter="handleSearch" />
        <el-select v-model="query.status" clearable placeholder="产品状态">
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="未发布" value="UNPUBLISHED" />
        </el-select>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column label="产品名称" min-width="180" prop="name" />
        <el-table-column label="产品编号" min-width="150" prop="code" />
        <el-table-column label="Tal ID" min-width="170" prop="talId" />
        <el-table-column label="产品分类" min-width="130" prop="categoryName" />
        <el-table-column label="通信模组" min-width="130" prop="communicationModuleName" />
        <el-table-column label="密钥数" min-width="95" prop="keyNumber" />
        <el-table-column label="激活设备" min-width="100" prop="activeDeviceNumber" />
        <el-table-column label="在线设备" min-width="100" prop="onLineDeviceNumber" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'">
              {{ row.status === "PUBLISHED" ? "已发布" : "未发布" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" min-width="180">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" @click="openEdit(row)">修改</el-button>
            <template v-if="row.status !== 'PUBLISHED'">
              <el-button link type="primary" @click="handleRelease(row)">发布</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.pageNumber"
        v-model:page-size="query.pageSize"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[20, 50, 100]"
        :total="total"
        @current-change="loadProducts"
        @size-change="handleSizeChange"
      />
    </div>

    <ProductCreateDrawer v-model="createVisible" :product-id="editingProductId" @success="loadProducts" />
  </section>
</template>

<script lang="ts" src="./index.ts"></script>
<style scoped lang="scss" src="./style.scss"></style>
