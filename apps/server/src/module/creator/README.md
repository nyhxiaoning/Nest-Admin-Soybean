# PC Creator Center 模块分层

`creator` 是独立于后台管理端的业务域。后续新增作品、团队、发布等模块时，继续在本目录增加同级业务模块，不复用 `SysUser`、租户、角色或菜单认证。

```text
creator/
├── auth/                 # 登录业务模块
│   ├── controllers/      # HTTP 接口
│   ├── services/         # 认证业务逻辑
│   ├── dto/              # 请求与响应契约
│   └── creator-auth.module.ts
├── common/               # Creator 各业务模块共享层
│   ├── constants/        # JWT 标记、Redis Key、TTL
│   ├── decorators/       # 当前 Creator 用户参数装饰器
│   ├── guards/           # Creator JWT Guard
│   ├── interfaces/       # Creator Session 类型
│   └── index.ts          # 公共导出入口
└── creator.module.ts     # Creator 业务域入口
```

新增 Creator 受保护接口时：

1. 所属模块导入 `CreatorAuthModule`。
2. Controller 使用 `@NotRequireAuth()` 跳过后台全局 JWT 流程，并使用 `@IgnoreTenant()`。
3. 具体受保护接口添加 `@UseGuards(CreatorJwtGuard)`。
4. 使用 `@CreatorUser()` 获取 `CreatorSession`。

共享能力统一从 `../common` 导入，业务模块之间不要互相引用 Service。
