# VForm 3 完整工具栏与防挤压设计

## 背景与根因

`/tool/build` 已通过外层双向滚动和 `1200 × 800px` 最小尺寸避免整体内容被隐藏，但实际渲染仍存在两类问题：

1. VForm 3 的左侧组件库固定约 `260px`、中间区域最小 `680px`、右侧设置栏默认约 `300px`，总宽度已经达到 `1240px`，因此 `1200px` 仍会触发内部 Flex 压缩。
2. VForm 3.0.10 的工具栏按钮内容宽度约 `600px`，默认 `designerConfig.toolbarMaxWidth` 为 `450px`，工具栏本身又使用 `overflow: hidden`，导致后半部分按钮被裁切。按钮对应的方法和弹窗都已包含在依赖包中，并非功能缺失。

## 目标

- 左侧组件库、中间设计画布和右侧设置栏不再因后台内容区变窄而挤压变形。
- 完整展示并启用以下六项官方功能：
  - 清空
  - 预览
  - 导入 JSON
  - 导出 JSON
  - 导出代码
  - 生成 SFC
- 保持现有双向滚动策略；空间不足时滚动查看，不对设计器做缩放。
- 不修改 `vform3-builds` 源码，不重复实现官方工具栏或弹窗。

## 方案

### 页面配置

在 `/tool/build` 页面声明稳定的 `designerConfig` 对象，并通过 `:designer-config` 传给 `VFormDesigner`：

- `toolbarMaxWidth: 650`
- `toolbarMinWidth: 650`
- `clearDesignerButton: true`
- `previewFormButton: true`
- `importJsonButton: true`
- `exportJsonButton: true`
- `exportCodeButton: true`
- `generateSFCButton: true`

将工具栏最小和最大宽度都设为 `650px`，可避免 VForm 根据 `window.innerWidth` 再次把工具栏收窄。六个功能开关显式设置为 `true`，使页面意图清晰，并避免依赖包默认值变更造成行为漂移。

### 布局边界

将 VForm 根容器最小宽度从 `1200px` 提高到 `1500px`，最小高度继续保持 `800px`：

- 左栏约 `260px`
- 中间区域约 `900px`
- 右栏约 `300px`
- 剩余宽度用于边框及布局余量

外层 `.vform-designer-page` 继续使用 `overflow: auto`。后台内容区小于 `1500 × 800px` 时，底部和右侧出现滚动条；空间充足时设计器铺满可用区域。

## 数据与交互

本次只向 VForm 官方组件传递显示配置。清空、预览、JSON 导入导出、代码导出和 SFC 生成继续调用 VForm 3.0.10 内部已有方法、对话框和数据模型，不增加新的状态同步或业务接口。

## 测试与验收

- 组件测试验证 `VFormDesigner` 收到工具栏宽度 `650` 和六个值为 `true` 的功能开关。
- 布局回归测试验证 VForm 根容器最小宽度为 `1500px`、最小高度为 `800px`，外层仍为双向滚动。
- 运行目标 Vitest、前端 ESLint 和 Vite 生产构建。
- 手工打开 `/tool/build`，确认六个按钮均可见；分别打开预览、导入 JSON、导出 JSON、导出代码和生成 SFC 弹窗，并确认清空按钮可触发官方确认流程。
- 缩小内容区，确认三栏比例不变且可通过水平、垂直滚动访问全部内容。

## 非目标

- 不新增自定义工具栏。
- 不修改 VForm 的官方弹窗、导入导出格式或生成代码内容。
- 不为移动端实现压缩版设计器。
- 不改变管理后台其他路由的滚动行为。
