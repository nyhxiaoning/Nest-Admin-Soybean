# Prisma Client 生成修复设计

## 问题

pnpm 10 将 `@prisma/engines`、`prisma` 和 `@prisma/client` 记录在 `ignoredBuilds` 中，导致 Prisma 引擎二进制与 `.prisma/client` 生成产物缺失。TypeScript 因此无法从 `@prisma/client` 导入 `Prisma`、`PrismaClient` 及模型类型。

## 方案

在仓库根目录的 `pnpm-workspace.yaml` 中配置 `onlyBuiltDependencies`，仅允许以下 Prisma 包执行安装构建脚本：

- `@prisma/engines`
- `prisma`
- `@prisma/client`

不修改业务源码或 Prisma import。配置完成后重新构建依赖，并在 server 包中执行 `prisma generate`。

## 验证

1. Prisma CLI 能识别本机 `darwin-arm64` 查询引擎和 schema 引擎。
2. `node_modules/.prisma/client` 存在并导出 `Prisma` 与 `PrismaClient`。
3. server TypeScript 编译不再出现 `@prisma/client` 的 TS2305 错误。

## 风险与回滚

该配置只放行三个 Prisma 包的安装脚本，不扩大其他依赖的脚本权限。若需回滚，删除新增的 `onlyBuiltDependencies` 配置并重新安装依赖；业务代码不受影响。
