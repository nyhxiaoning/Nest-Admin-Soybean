# PC Creator Center 作品模块设计

## 目标

在 `apps/server` 的 `creator` 独立业务域中实现作品管理、作品标签、阿里云 OSS STS 上传凭证和发布管理能力，并完整对接：

- `apps/pc-creator-center/src/api/works.ts`
- `apps/pc-creator-center/src/api/publish.ts`

作品接口只接受 PC Creator Center 的登录凭证，不接入后台 `SysUser`、租户、角色或菜单权限体系。

## 约束

- 所有接口必须经过 `CreatorJwtGuard`。
- 当前创作者来自 `@CreatorUser()`，客户端不得提交或覆盖 `creatorId`。
- 查询、详情、修改、删除和发布操作必须同时校验作品 ID、当前 `creatorId` 和未删除状态。
- 删除采用软删除；审核中或已发布的作品不能直接删除。
- 浏览器上传只能获得阿里云 STS 临时凭证，不能返回长期 AccessKey。
- NestJS 继续使用统一的 `{ code, msg, data }` 响应；PC Creator Center 请求层负责兼容映射为现有的 `result` 字段。
- 本期不实现后台管理员审核 Controller，但审核记录模型和状态流转必须为后续审核模块保留稳定边界。

## 方案比较

### 方案一：单 Controller、单 Service

开发文件少，但 CRUD、发布状态机、标签和 STS 会集中到一个 Service，后续审核模块接入时容易继续膨胀。不采用。

### 方案二：单 Works 模块，按职责拆分服务（采用）

作品相关能力由一个 `CreatorWorksModule` 统一装配，内部拆分作品 CRUD、发布流程、上传凭证、Repository 和 DTO。Creator 通用的阿里云存储能力放到同级 `storage` 模块，未来团队、素材等模块可以复用。

### 方案三：CRUD、发布、标签、上传分别建立 Nest 模块

边界最严格，但当前数据模型高度关联，会产生较多模块导入、循环依赖和重复鉴权配置。当前阶段成本高于收益，不采用。

## 模块结构

```text
apps/server/src/module/creator/
├── auth/
├── common/
├── storage/
│   ├── dto/
│   ├── services/creator-oss-sts.service.ts
│   └── creator-storage.module.ts
├── works/
│   ├── constants/creator-work.constants.ts
│   ├── controllers/
│   │   ├── creator-work-tags.controller.ts
│   │   └── creator-works.controller.ts
│   ├── dto/
│   │   ├── requests/
│   │   ├── responses/
│   │   └── index.ts
│   ├── repositories/
│   │   ├── creator-work.repository.ts
│   │   ├── creator-work-submission.repository.ts
│   │   └── creator-work-tag.repository.ts
│   ├── services/
│   │   ├── creator-work-release.service.ts
│   │   ├── creator-work-upload.service.ts
│   │   └── creator-works.service.ts
│   └── creator-works.module.ts
└── creator.module.ts
```

## 数据模型

### CreatorWork

保存创作者正在编辑的作品数据：标题、类型、封面、GIF、可编辑文件、BIN 文件、画布尺寸、帧信息、预览、备注、发布状态、版本、最后查看时间、创建更新时间和软删除时间。

核心索引：

- `(creatorId, deletedAt, updatedAt)`：我的作品分页。
- `(creatorId, publishStatus, deletedAt)`：发布管理筛选和统计。
- `(creatorId, title)`：标题搜索。

### CreatorWorkTag

保存可发布分类，使用稳定且唯一的 `tagCode`，支持启停和排序。首期由 Prisma seed 写入基础标签。

### CreatorWorkTagRelation

保存作品与标签关系。当前前端只选择一个标签，但采用关系表可以避免未来多标签需求修改作品主表。

### CreatorWorkSubmission

保存每次首次发布或更新发布的审核记录：

- `type`: `PUBLISH` 或 `UPDATE`
- `status`: `REVIEWING`、`APPROVED`、`REJECTED`、`WITHDRAWN`
- `snapshot`: 提交时的作品 JSON 快照
- `version`: 本次提交版本
- `remark`、`rejectedReason`
- `submittedAt`、`auditedAt`、`auditorId`

提交更新时线上仍使用最近一次审核通过的快照，创作者继续编辑不会直接改变线上内容。

## 状态机

```text
OFFLINE --submit--> REVIEWING
REVIEWING --approve--> PUBLISHED
REVIEWING --reject--> REJECTED
REVIEWING --withdraw--> OFFLINE
REJECTED --submit--> REVIEWING
PUBLISHED --submit-update--> PUBLISHED + pending UPDATE submission
PUBLISHED --unpublish--> OFFLINE
```

`CreatorWork.publishStatus` 表示作品当前对创作者展示的发布状态；是否存在待审核更新由最新的 `CreatorWorkSubmission` 判断。所有状态转换在事务中执行，并拒绝非法转换。

## API

所有 Controller 使用：

```ts
@NotRequireAuth()
@IgnoreTenant()
@UseGuards(CreatorJwtGuard)
```

接口范围：

```text
GET    /api/creator/works
GET    /api/creator/works/:id
POST   /api/creator/works
PUT    /api/creator/works/:id
DELETE /api/creator/works/:id
GET    /api/creator/work-tags
POST   /api/creator/works/upload-token
GET    /api/creator/works/releases
GET    /api/creator/works/release-candidates
POST   /api/creator/works/:id/submit
POST   /api/creator/works/:id/submit-update
POST   /api/creator/works/:id/withdraw
POST   /api/creator/works/:id/unpublish
DELETE /api/creator/works/releases/:id
```

静态路径 `upload-token`、`releases` 和 `release-candidates` 必须在 `:id` 路由之前声明，避免被动态参数捕获。

## 分页和返回契约

Creator 前端使用 `pageNumber/pageSize` 和以下分页格式：

```ts
interface PageResult<T> {
  list: T[]
  total: number
  pageNumber: number
  nextPage?: boolean
}
```

Works DTO 不直接继承后台使用 `pageNum` 的 `PageQueryDto`，而是定义 Creator 专用分页 DTO，从而保持前端契约不变。

服务端继续返回标准 `Result.ok(data)`。PC Creator Center 的 Axios 拦截器将服务端 `data` 映射为现有调用方使用的 `result`，避免 Creator API 与全局响应规范分叉。

## STS 安全设计

服务端使用阿里云 Node.js V2 SDK `@alicloud/sts20150401` 调用 `AssumeRole`。长期 AccessKey、Role ARN、Bucket 和 Region 只从环境配置读取。

每次请求根据文件角色生成上传前缀：

```text
creator/{creatorId}/cover/{yyyyMMdd}/{uuid}
creator/{creatorId}/gif/{yyyyMMdd}/{uuid}
creator/{creatorId}/editable/{yyyyMMdd}/{uuid}
creator/{creatorId}/bin/{yyyyMMdd}/{uuid}
```

STS 内联 Policy 只允许该前缀的 `oss:PutObject`，凭证有效期采用阿里云允许的最小值 900 秒。接口校验文件角色、名称、扩展名、MIME 和大小，并施加限流。

前端 `ali-oss` 初始化增加 `authorizationV4: true`。OSS Bucket 必须单独配置允许 PC Creator Center 来源的 CORS 规则。

## 错误处理

- 未登录或 Creator Session 失效：401。
- 作品不存在或不属于当前创作者：统一返回“作品不存在”，不泄露所有权信息。
- 非法发布状态转换：业务错误。
- 审核中或已发布作品直接删除：业务错误。
- STS 配置缺失或阿里云调用失败：记录不含密钥的结构化日志，并返回上传凭证获取失败。
- 参数、枚举、文件类型和大小错误：由全局 ValidationPipe 返回参数错误。

## 测试策略

- DTO 单元测试：分页转换、枚举、文件角色、文件大小和更新字段白名单。
- Service 单元测试：所有权约束、软删除、排序映射、统计、状态转换和 STS Policy 路径。
- Integration 测试：Prisma CRUD、分页、关键词、标签、发布记录和事务一致性。
- E2E 测试：未登录拒绝、Creator A 不能访问 Creator B、完整 CRUD、发布状态流和响应契约。
- STS 调用使用适配层 Mock，不在自动化测试中访问真实阿里云。

## 非目标

- 后台管理员审核接口和审核权限体系。
- OSS 文件病毒扫描、内容审核和孤儿文件自动回收。
- 多人协作编辑和作品团队所有权。
- 将 Creator 用户接入后台角色、租户或菜单。
