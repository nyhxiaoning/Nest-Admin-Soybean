# 后端返回的数据结构分析

## 后端返回格式（来自 /system/menu/getRouters）
```typescript
{
  name: "System",           // ❌ 大写
  path: "/system",
  component: "Layout",      // ❌ 应该是 "layout.base"
  meta: {
    title: "系统管理",       // ❌ 中文，应该是英文key
    icon: "local-icon-menu-system"  // ❌ 格式不对
  }
}
```

## 前端期望格式（ElegantConstRoute）
```typescript
{
  name: 'system',           // ✅ 小写
  path: '/system',
  component: 'layout.base', // ✅ 小写带点
  meta: {
    title: 'system',        // ✅ 英文key
    i18nKey: 'route.system',
    localIcon: 'menu-system',
    order: 1
  }
}
```

## 关键差异
1. ❌ component: "Layout" vs "layout.base"
2. ❌ meta.title 是中文 vs 英文i18nKey
3. ❌ icon格式不匹配
4. ❌ 缺少order等字段
