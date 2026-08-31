# Findings & Decisions

## Requirements

- 合并两份 NestJS 后端学习文档。
- 使用 HTML 图标和交互内容。
- 放在项目根目录，便于查看和记录。
- 自动保存进度与笔记，并支持 JSON 导入导出。

## Research Findings

- 当前后端是 NestJS + Prisma 的模块化单体。
- 原架构说明缺少 Creator 领域；交接文档已补充 14 阶段学习路线。
- 页面无需接入现有 Vite 应用，单文件最适合当前使用方式。
- 根目录已有两份 Markdown，可作为长期内容依据。

## Technical Decisions

| Decision | Rationale |
|---|---|
| 不加载外部库 | 保证 file:// 场景可用 |
| 状态结构带 schemaVersion | 为后续升级留出兼容空间 |
| 阶段状态与知识点完成度分开 | 支持主动标记和客观进度两种视角 |

## Resources

- `Nestjs项目架构学习说明.md`
- `Nestjs后端项目学习梳理交接.md`
- `apps/server/src/app.module.ts`
- `apps/server/src/module/`
- `apps/server/prisma/schema.prisma`

## Issues Encountered

| Issue | Resolution |
|---|---|
| 浏览器控制运行时未发现可用浏览器 | 未伪造视觉验收；使用 JSDOM 覆盖导航、状态、笔记、主题、搜索和数据备份 |
| 临时 HTTP 服务未保持到 curl 阶段 | 页面是独立静态文件，改以文件读取、脚本编译和 DOM 初始化验证交付物 |
