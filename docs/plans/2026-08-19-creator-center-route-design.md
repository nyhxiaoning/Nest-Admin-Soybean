# 创作者中心前端固定路由设计

## 目标

在 Web 端增加“创作者中心”菜单及“审批”“发布管理”两个子页面。路由仅允许已登录用户访问，但不依赖后端菜单权限或角色权限。

## 现状

项目使用动态路由模式。登录后，`useRouteStore` 获取后端路由并转换为 `ElegantConstRoute`，随后通过 `createDynamicRoutes()` 取得前端本地路由，按路由名称合并，最终统一注册到 Vue Router 并生成菜单、面包屑和标签页。

`meta.constant: true` 在当前守卫中代表无需登录，因此不适合本需求。没有 `constant` 且没有 `roles` 的路由会要求登录，但不会触发角色校验。

## 方案

在动态模式的前端路由集合中增加以下非 constant 路由树：

```text
创作者中心 /creator
├── 审批 /creator/approval
└── 发布管理 /creator/publish-management
```

路由名称分别为 `creator`、`creator_approval` 和 `creator_publish-management`。父路由使用 `layout.base`，子路由使用 Elegant Router 的视图映射加载对应 Vue 页面。

两个页面本次只提供可访问的基础占位内容，不接入业务接口。

## 拼装行为

- 后端动态路由先进入现有路由映射。
- 前端固定业务路由随后参与合并。
- 后端不存在 `creator` 时，整棵前端路由树直接加入。
- 后端存在同名 `creator` 父路由时，前端子路由按现有规则拼入父路由。
- 所有合并后的路由统一生成菜单和注册到 Vue Router。

## 权限边界

- 未登录访问：由现有路由守卫跳转登录页。
- 已登录访问：允许访问。
- 角色限制：不配置 `meta.roles`，不校验角色。
- 后端菜单权限：创作者中心不依赖后端是否返回该菜单。

## 文件范围

- 修改动态前端路由定义。
- 创建审批和发布管理两个占位页面。
- 更新中英文路由文案。
- 通过 Elegant Router 生成或同步视图映射与路由类型。
- 不修改 `base-layout/index.vue`。

## 验证

- 类型检查通过。
- Web 端生产构建通过。
- 路由定义中不存在 `constant: true` 或 `roles`。
- 两个页面均被视图映射收录，登录后能从菜单进入。
