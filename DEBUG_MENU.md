# 菜单不显示完整诊断指南

## 问题描述
- ✅ 后端接口 `/api/system/menu/getRouters` 请求成功
- ✅ 返回了正确的数据（System, Monitor, Tool 等）
- ❌ 左侧菜单仍然不显示

## 已应用的修复

### 1. Home 路由修复
**文件**: `apps/web/src/router/routes/index.ts:42-43`
```typescript
constant: true,  // ✅ 已添加
order: 1         // ✅ 从 -1 改为 1
```

### 2. Icon 转换修复
**文件**: `apps/web/src/store/modules/route/index.ts:123`
```typescript
route.meta.localIcon = route.meta.icon.replace('local-icon-', '');  // ✅ 修复
```

### 3. 空值保护
**文件**:
- `apps/web/src/layouts/context/index.ts`
- `apps/web/src/layouts/modules/global-menu/context/index.ts`

```typescript
// ✅ 添加了空值检查
if (!selectedKey.value) {
  return;
}
```

### 4. 调试日志
**文件**: `apps/web/src/store/modules/route/index.ts`

已添加调试日志：
- `initDynamicAuthRoute`: 检查后端返回的数据
- `handleConstantAndAuthRoutes`: 检查生成的 menus

## 调试步骤

### 步骤 1: 打开浏览器开发者工具
1. 按 `F12` 或 `Cmd+Option+I`
2. 切换到 **Console** 标签页
3. 重新登录

### 步骤 2: 检查调试日志
在控制台中查找以下日志：

```javascript
// 应该看到后端返回的数据
DEBUG: 后端返回的菜单数据: [...]

// 应该看到生成的 menus
DEBUG: menus after getGlobalMenus: { count: X, data: [...] }
```

### 步骤 3: 检查 Pinia Store
在控制台运行：

```javascript
// 检查 route store
const routeStore = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia.state.value.route;
console.log('menus:', routeStore.menus);
console.log('menus length:', routeStore.menus.length);
console.log('authRoutes:', routeStore.authRoutes);
console.log('constantRoutes:', routeStore.constantRoutes);
```

### 步骤 4: 检查 Vue 组件
在控制台运行：

```javascript
// 检查当前路由
const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router;
console.log('currentRoute:', router.currentRoute.value);

// 检查菜单组件
const menuComponent = document.querySelector('.n-menu');
console.log('menu component:', menuComponent);
console.log('menu options:', menuComponent?.__vueParentComponent?.props?.options);
```

## 可能的问题和解决方案

### 问题 1: 后端数据格式不匹配
**症状**: `authRoutes` 为空或格式错误

**检查**: 查看 `DEBUG: 后端返回的菜单数据` 日志

**可能原因**:
- `name` 字段是大写的 "System" 而不是 "system"
- `component` 字段是 "Layout" 而不是标准格式

**解决方案**: `parseRouter` 应该已经处理了这些转换，检查 `authRoutes` 日志

### 问题 2: 菜单被过滤
**症状**: `authRoutes` 有数据，但 `menus` 为空

**检查**: 查看 `getGlobalMenusByAuthRoutes` 函数的逻辑

**可能原因**:
- `route.meta.hideInMenu` 被错误地设置为 `true`
- `route.children` 都被过滤了

**解决方案**: 检查菜单数据的 `hideInMenu` 字段

### 问题 3: Vue 组件未更新
**症状**: Store 中有数据，但菜单不显示

**检查**:
```javascript
// 在控制台强制更新
const app = document.querySelector('#app').__vue_app__;
app.config.globalProperties.$forceUpdate();
```

**可能原因**:
- 响应式数据没有触发更新
- 组件渲染逻辑有问题

**解决方案**: 检查 Vue devtools 中的组件状态

### 问题 4: 图标渲染失败
**症状**: 菜单显示但图标不显示或整个菜单不渲染

**检查**: 查看控制台是否有图标相关的错误

**可能原因**:
- `SvgIconVNode` 组件渲染失败
- 图标路径不正确

## 临时解决方案

如果问题仍然存在，可以尝试临时修改 `getGlobalMenusByAuthRoutes` 函数来强制显示菜单：

```typescript
// 临时修改：移除 hideInMenu 检查
export function getGlobalMenusByAuthRoutes(routes: ElegantConstRoute[]) {
  const menus: App.Global.Menu[] = [];

  routes.forEach(route => {
    // 临时：注释掉 hideInMenu 检查
    // if (!route.meta?.hideInMenu) {
      const menu = getGlobalMenuByBaseRoute(route);

      if (route.children?.some(child => !child.meta?.hideInMenu)) {
        menu.children = getGlobalMenusByAuthRoutes(route.children);
      }

      menus.push(menu);
    // }
  });

  return menus;
}
```

## 下一步

请提供以下信息以便进一步诊断：

1. 控制台中的 `DEBUG:` 日志内容
2. `routeStore.menus` 的值
3. `routeStore.authRoutes` 的值
4. 浏览器控制台的所有错误信息

## 验证清单

- [ ] 后端接口返回数据正常
- [ ] `addAuthRoutes` 正确转换数据
- [ ] `authRoutes` 包含 System, Monitor, Tool
- [ ] `menus` 包含 System, Monitor, Tool
- [ ] Vue 组件正确接收 menus 数据
- [ ] 图标组件正确渲染
- [ ] 左侧菜单显示所有模块
