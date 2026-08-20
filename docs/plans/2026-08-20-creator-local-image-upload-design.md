# PC Creator Center 本地图片暂存设计

## 目标

为 NestJS Creator 业务域增加需要 Creator 登录态的图片上传接口。图片先暂存在当前 NestJS 服务器，单文件最大 10 MiB，接受所有 `image/*` MIME 类型。存储层使用稳定适配器契约，未来可替换为 OSS 而不修改 Controller 和前端响应格式。

## 采用方案

使用存储适配器设计：

- `CreatorImageStorage` 定义上传契约。
- `LocalCreatorImageStorage` 实现本地文件暂存。
- `CreatorImageUploadService` 负责业务校验和统一响应。
- Controller 只依赖业务 Service，不感知本地磁盘或 OSS。
- 未来增加 `OssCreatorImageStorage` 时，通过 Module Provider 替换实现。

不直接复用全局 `UploadService`，避免 Creator 的目录隔离、过期清理和未来 OSS 切换逻辑污染后台通用上传服务。

## API 契约

```text
POST /api/creator/uploads/images
Content-Type: multipart/form-data
Authorization: Bearer <creator-token>
file: <binary>
```

Controller 使用：

```ts
@NotRequireAuth()
@IgnoreTenant()
@UseGuards(CreatorJwtGuard)
```

成功数据：

```json
{
  "fileId": "uuid",
  "url": "http://localhost:8080/profile/creator/.../uuid.png",
  "originalName": "image.png",
  "contentType": "image/png",
  "size": 102400,
  "expiresAt": 1787800000000
}
```

NestJS 继续使用 `Result.ok(data)` 包装响应。

## 本地存储

目录格式：

```text
{FILE_UPLOAD_LOCATION}/creator/{creatorId}/images/{yyyy/MM/dd}/{uuid}.{ext}
```

- `fileId` 为服务端生成的 UUID。
- 不使用客户端文件名作为存储文件名。
- 扩展名优先根据 MIME 推导；无法推导时使用安全默认后缀。
- URL 基于 `FILE_DOMAIN` 和 `FILE_SERVE_ROOT` 生成。
- 文件仅写入 `creator` 专用子目录。

## 校验与安全

- Multer `fileSize` 限制为 10 MiB。
- 仅接受 `mimetype` 以 `image/` 开头的文件，不设置图片扩展名白名单。
- 拒绝空文件和缺失文件的请求。
- 存储路径由服务端构造，防止目录穿越。
- 不记录文件内容、Creator JWT 或 OSS 凭证。
- 允许 SVG 等主动内容时，生产环境应使用独立静态文件域名，不与 API Cookie 域共享。

## 过期清理

- 默认有效期为 7 天，由 Creator Storage 配置提供。
- 清理服务定期扫描 Creator 临时图片目录。
- 只删除修改时间早于过期阈值的普通文件。
- 不遍历或删除全局上传目录中的其他业务文件。
- 本期不建立数据库文件记录，过期时间根据文件修改时间计算。

## 未来 OSS 替换

OSS 适配器必须保持以下语义：

- 输入仍是 Creator Session 和 Multer 文件。
- 输出仍是 `fileId`、`url`、`originalName`、`contentType`、`size` 和 `expiresAt`。
- Controller 路由、表单字段和前端调用保持不变。
- 本地清理实现可替换为 OSS Lifecycle，不改变业务 Service。

## 测试

- Nest 模块可正常解析 Creator Guard 和存储 Provider。
- 未登录请求被拒绝。
- 非图片 MIME、空文件、超过 10 MiB 的文件被拒绝。
- 文件写入当前 Creator 隔离的目录并返回正确 URL。
- 清理服务只删除 Creator 目录中超过 7 天的文件。
- 使用替代 Provider 时无需修改 Controller。

## 非目标

- 本期不实现作品引用确认和永久化接口。
- 不实现图片转码、缩略图、病毒扫描或内容审核。
- 不修改现有浏览器直传 OSS STS 接口。
