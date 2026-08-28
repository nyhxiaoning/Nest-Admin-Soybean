# Creator Work Tag Defaults Design

## Goal

Keep every existing `creator_work_tag` row and idempotently add any missing entries from an eight-item default classification set. `GET /api/creator/work-tags` continues to return enabled database rows with exactly `id`, `name`, and `tagCode`.

## Design

- Store the eight defaults in one shared TypeScript constant used by runtime initialization and Prisma seed code.
- Let `CreatorWorkTagRepository` implement Nest's `OnModuleInit` lifecycle and call Prisma `createMany` with `skipDuplicates: true`.
- Treat `tagCode` as the identity. Existing rows with a matching code are not renamed, re-enabled, or reordered; custom rows remain untouched.
- Keep the controller and response query unchanged. Because defaults are persisted before requests are served, work submission can safely resolve every returned default `tagCode`.

## Defaults

| name | tagCode |
| --- | --- |
| 原创作品 | `ORIGINAL` |
| 动态作品 | `ANIMATION` |
| 静态作品 | `STATIC` |
| 像素艺术 | `PIXEL_ART` |
| 游戏素材 | `GAME_ASSET` |
| 角色设计 | `CHARACTER` |
| 场景设计 | `SCENE` |
| 其他 | `OTHER` |

Database-generated UUIDs provide the `id` property returned by the endpoint.

## Verification

- A repository behavior test starts with a customized `ORIGINAL` row and one custom row, initializes defaults, and verifies that all eight codes exist without overwriting the customized row.
- Existing creator works tests and the server build must pass.
