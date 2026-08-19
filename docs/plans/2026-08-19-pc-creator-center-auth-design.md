# PC Creator Center 独立认证模块设计

## 目标

在 `apps/server` 新增一套专用于 `PC Creator Center` 的认证模块，支持：

- 手机号四位验证码登录；
- 手机号密码登录；
- 验证码登录时自动创建创作者账号；
- 登录后首次设置或修改密码；
- Creator JWT 登出及 Redis Session 失效。

该模块与后台管理端现有的 `SysUser`、租户、角色、菜单和登录流程完全隔离。

## 术语与代码标记

统一使用术语 `PC Creator Center`：

- Swagger 分组：`PC Creator Center - 认证`；
- JWT Payload：`subjectType: 'pc-creator-center'`；
- Redis Key：`pc-creator-center:auth:*`；
- Controller、Service、DTO、Guard、Prisma 模型注释均注明该业务域。

## 模块结构

```text
apps/server/src/module/creator/
├── auth/
│   ├── controllers/
│   ├── services/
│   ├── dto/
│   └── creator-auth.module.ts
├── common/
│   ├── constants/
│   ├── decorators/
│   ├── guards/
│   ├── interfaces/
│   └── index.ts
├── creator.module.ts
└── README.md
```

`CreatorModule` 注册到 `AppModule`。`auth` 保存登录业务实现，`common` 保存未来作品、团队、发布等 Creator 模块可以复用的 Session、Guard、装饰器和常量。模块复用全局 Prisma、Redis、JWT 配置、bcrypt、统一响应与异常设施，但不依赖后台 `MainService`、`UserService` 或角色菜单服务。

## 数据模型

新增独立 Prisma 模型 `CreatorUser`，映射数据库表 `creator_user`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | UUID | 主键 |
| `phone` | String | 唯一手机号 |
| `password` | String? | nullable bcrypt 哈希 |
| `name` | String | 显示名称，自动注册时生成 |
| `status` | String | `ACTIVE` 或 `DISABLED` |
| `lastLoginAt` | DateTime? | 最近登录时间 |
| `createdAt` | DateTime | 创建时间 |
| `updatedAt` | DateTime | 更新时间 |

该表不包含租户、角色或菜单关系。

## HTTP 接口

### `POST /creator/auth/code`

公开接口。请求：

```json
{
  "accountType": "PHONE",
  "phone": "13800138000"
}
```

生成 `0000` 至 `9999` 的密码学安全四位随机验证码，Redis 保存5分钟，并设置60秒发送冷却。开发和测试环境响应 `{ "code": "1234" }`；生产环境不返回验证码，仅预留真实短信发送位置。

### `POST /creator/auth/login`

公开接口，支持两种请求。

验证码登录：

```json
{
  "accountType": "PHONE",
  "loginType": "CODE",
  "phone": "13800138000",
  "code": "1234"
}
```

密码登录：

```json
{
  "accountType": "PHONE",
  "loginType": "PASSWORD",
  "phone": "13800138000",
  "password": "example-password"
}
```

验证码通过后若手机号不存在，则在 Prisma 事务中自动创建 `CreatorUser`。登录成功返回：

```json
{
  "token": "jwt-token",
  "id": "creator-user-uuid",
  "name": "用户38000",
  "phone": "13800138000",
  "menuCodes": []
}
```

### `POST /creator/auth/password`

使用 Creator JWT。请求包含 `newPassword`，已有密码时还必须包含并校验 `currentPassword`；首次设置密码不要求原密码。密码长度8至64位。

### `POST /creator/auth/logout`

使用 Creator JWT。删除当前 `pc-creator-center:auth:session:<uuid>`，令 Token 立即失效。兼容现有前端请求体中的 `token` 字段，但以 Bearer Token 标识当前 Session。

## JWT 与全局守卫隔离

Creator Controller 使用 `@NotRequireAuth()` 与 `@IgnoreTenant()` 跳过后台用户及租户认证流程。需要认证的接口显式使用独立 `CreatorJwtGuard`。

Creator JWT Payload：

```ts
{
  sub: creatorUser.id,
  uuid: sessionUuid,
  subjectType: 'pc-creator-center'
}
```

Creator Session 只写入 `pc-creator-center:auth:session:<uuid>`。独立 Guard 同时校验 JWT 签名、`subjectType`、Redis Session 和数据库用户状态，因此后台 Token 不能访问 Creator 受保护接口。

## Redis Key 与时效

| Key | TTL | 用途 |
|---|---:|---|
| `pc-creator-center:auth:code:<phone>` | 5分钟 | 登录验证码及失败次数 |
| `pc-creator-center:auth:code-cooldown:<phone>` | 60秒 | 防止频繁发送 |
| `pc-creator-center:auth:password-fail:<phone>` | 15分钟 | 密码失败次数 |
| `pc-creator-center:auth:password-lock:<phone>` | 15分钟 | 密码登录锁定 |
| `pc-creator-center:auth:session:<uuid>` | 与 JWT 一致 | Creator 登录 Session |

验证码最多错误5次，验证成功立即删除。密码连续失败5次锁定15分钟。密码错误统一返回“手机号或密码错误”，避免泄露用户是否存在。

## 校验与错误处理

- `accountType` 仅接受 `PHONE`；`EMAIL` 返回暂不支持。
- `loginType` 仅接受 `CODE` 或 `PASSWORD`。
- 手机号必须符合中国大陆11位手机号格式。
- 验证码必须为四位数字。
- 账号状态为 `DISABLED` 时拒绝登录和受保护操作。
- 使用项目现有 `Result` 与 `BusinessException` 返回统一响应。

## 测试与验证

- 四位验证码范围和 Redis TTL；
- 发送冷却、过期、错误次数和一次性消费；
- 验证码登录自动创建用户及重复登录不重复创建；
- 密码未设置、密码错误、连续失败锁定和禁用账号；
- 首次设置密码及修改密码的原密码校验；
- Creator JWT 类型、Redis Session、登出失效及后台 Token 隔离；
- Prisma Schema 和迁移校验；
- Creator 模块单元测试、类型检查及 Server 构建。
