<template>
  <div class="page-header">
    <div>
      <el-breadcrumb v-if="breadcrumbs?.length" class="page-header__breadcrumb" separator="/">
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.label" :to="item.to">
          {{ item.label }}
        </el-breadcrumb-item>
      </el-breadcrumb>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import "./page-header.scss"

defineProps<{
  title: string
  description?: string
  breadcrumbs?: Array<{
    label: string
    to?: string
  }>
}>()
</script>
