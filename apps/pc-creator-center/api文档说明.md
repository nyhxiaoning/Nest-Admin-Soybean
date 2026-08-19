# 像素画编辑器 API 文档说明

> 本文档描述像素画编辑器作品的多帧数据结构设计、后端接口规范、数据流转方案及存储优化建议。
> 适用于：作品保存到后端、多端编辑同步、播放与展示分发。

---

## 一、现有数据结构分析

### 1.1 核心类型层级

```
Project（项目）
├── id / name / version / width / height     ← 元信息
├── currentFrameIndex / activeLayer          ← 游标状态
├── createdAt / updatedAt                    ← 时间戳
└── frames: Frame[]                          ← 帧列表

Frame（帧）
├── id / delay                               ← 帧级元信息
├── viewportX / viewportY                    ← 视窗偏移（在 256×256 大画布上的位置）
└── layers: Layer[]                          ← 图层栈

Layer（图层）
├── id / name                                ← 图层标识
├── visible / opacity                        ← 显示控制
├── pixels: PixelColor[]                     ← 32×16 视窗像素（密集数组）
└── canvasPixels: Record<string, string>      ← 256×256 世界像素（稀疏 map，"x,y"→hex）

PixelColor = string | null                    ← hex 颜色 or null（透明/空）
```

### 1.2 关键设计特点

| 特性 | 说明 |
|------|------|
| **双重坐标表示** | `pixels[]` 是相对视窗的密集数组，`canvasPixels{}` 是世界坐标的稀疏 map，互相同步 |
| **合成而非合并** | 渲染时实时 alpha 混合（`compositeFrame`），不预合成，保留图层可编辑性 |
| **稀疏存储优化** | `canvasPixels` 只存非空像素，大画布下节省大量空间 |
| **版本迁移** | `version` 字段（当前 v4），`sanitizeProject()` 负责旧版本数据清洗 |
| **序列化清洗** | `serializeProjectForSave()` 持久化前移除 `canvasPixels`，减小 localStorage 体积 |

### 1.3 当前常量约束

```
画布:  256 × 256 世界画布，32 × 16 视窗（可平移）
图层:  最多 4 层
帧数:  GIF 导出上限 50 帧
调色板: 24 色 PICO-8 风格
```

### 1.4 当前 GIF 导出链路

```
Project.frames[]
  → compositeFrame(frame)          // 每帧的 layers 实时 alpha 混合 → 512px 密集数组
  → encodeGif({ width, height, scale, frames: [{ delay, pixels }] })
  → Blob → downloadBlob()          // 浏览器下载 .gif 文件
```

**当前痛点**：

- **只导不存**：`exportGif()` 生成 Blob 后直接触发浏览器下载，没有走 HTTP 上传到后端
- **导出时才合成**：`compositeFrame()` 在导出那一刻才把每帧的图层压平
- **GIF 只进不出**：`loadGifImage()` 可以解码 GIF 进项目，但项目没法存回后端做二次编辑
- **没有增量更新**：`touchProject()` 每次改动都全量写 localStorage，后端无法做增量合并

---

## 二、分发场景与数据需求

| 分发形态 | 数据载体 | 前端需求 |
|---------|---------|---------|
| **静态图** | PNG 图片 URL / base64 | 只展示当前帧的合成效果 |
| **GIF 动图** | GIF 文件 URL / base64 | 展示所有帧的动画播放 |
| **二次编辑** | 分层 JSON | 恢复完整项目状态，可继续编辑 |

---

## 三、多帧作品数据结构设计

### 方案 A：最小化分发 — 纯图片 URL

适合内容分发网络（CDN）、社交分享、预览列表。

```json
{
  "id": "art_xxx",
  "name": "作品名",
  "type": "static" | "animated",
  "thumbnail": "https://cdn.example.com/art/art_xxx/thumb.png",
  "preview":   "https://cdn.example.com/art/art_xxx/preview.png",
  "gifUrl":    "https://cdn.example.com/art/art_xxx/anim.gif",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "createdAt": 1752500000000
}
```

**思路**：GIF 编码和 PNG 编码前置到服务端/构建阶段。前端拿到 URL 直接 `<img>` 展示，零解析开销。

---

### 方案 B：精简 JSON — 保留可渲染性，不需要编辑

适合需要前端二次渲染（如 LED 预览、自定义放大比例导出）但不需要编辑的场景。

```json
{
  "id": "art_xxx",
  "name": "作品名",
  "type": "static" | "animated",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "frames": [
    {
      "id": "frame_xxx",
      "index": 0,
      "delay": 120,
      "pixels": ["#ffcc00", null, null, "#00e436", ...]  // 512 个元素的密集数组
    }
  ]
}
```

**思路**：
- 去掉 `layers` / `canvasPixels` / `viewportX/Y` — 分发端不需要图层编辑能力
- `frames[].pixels` 预合成（用 `compositeFrame()` 计算好），分发端直接画，省去混合逻辑
- 若只需要静态图，只发 `frames[0].pixels` + `width` / `height`

---

### 方案 C：完整可编辑 — 保留分层数据

适合作品回编辑、跨端同步、云端保存-加载。

```json
{
  "id": "art_xxx",
  "name": "作品名",
  "type": "static" | "animated",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "currentFrameIndex": 0,
  "activeLayer": 0,
  "createdAt": 1752500000000,
  "updatedAt": 1752500000000,
  "thumbnail": "https://cdn.example.com/art/art_xxx/thumb.png",
  "gifUrl": "https://cdn.example.com/art/art_xxx/anim.gif",
  "frames": [
    {
      "id": "frame_xxx",
      "index": 0,
      "delay": 120,
      "viewportX": 112,
      "viewportY": 120,
      "layers": [
        {
          "id": "layer_xxx",
          "name": "图层 1",
          "visible": true,
          "opacity": 1.0,
          "pixels": {
            "0,0": "#ffcc00",
            "1,0": "#ffcc00",
            "2,0": "#00e436"
          }
        }
      ]
    }
  ]
}
```

**思路**：
- 完整保留当前数据结构
- `pixels` 采用稀疏 map（`"x,y" → "#rrggbb"`）而非密集数组，节省 96%+ 存储
- 附加分发辅助字段：`thumbnail`（缩略图）、`gifUrl`（预渲染 GIF）

---

### 方案 D：二进制高效编码（进阶）

适合大量像素作品批量下发、WebSocket 实时推送、低带宽场景。

```
┌──────────────────────────────────────────────────────────┐
│  Header (16 bytes)                                         │
│    magic: "PXA1"  version: u8  width: u8  height: u8       │
│    frameCount: u16  layerCount: u8  flags: u8  reserved     │
├──────────────────────────────────────────────────────────┤
│  Per-Frame (变长)                                          │
│    delay: u16  layerCount: u8  [layer entries...]          │
├──────────────────────────────────────────────────────────┤
│  Per-Layer                                                 │
│    visible: u1  opacity: u7  pixelCount: u16              │
│    [pixel entries: index:u16, color:RGB24]                 │
└──────────────────────────────────────────────────────────┘
```

- 只存非空像素（稀疏编码），`index` 用 u16，颜色用 RGB24
- 32×16 = 512 像素，空像素占比高时压缩比大
- 无需 JSON 解析，直接 `ArrayBuffer` → `Uint8Array` 解码

---

## 四、数据格式对比

| 方案 | JSON 体积 | 解析速度 | 可编辑性 | 实现成本 | 适用场景 |
|------|----------|---------|---------|---------|---------|
| A 图片 URL | 最小 | 最快 | 不支持 | 低 | CDN 分发、社交分享 |
| B 精简 JSON | 中等 | 中等 | 不支持 | 中 | 二次渲染、自定义导出 |
| C 完整 JSON | 最大 | 中等 | 支持 | 低 | 编辑同步、云端保存 |
| D 二进制 | 最小 | 最快 | 支持 | 高 | 批量推送、WebSocket |

---

## 五、后端接口规范

### 5.1 作品管理

#### 创建作品

```http
POST /api/artworks
Content-Type: application/json

{
  "name": "像素猫",
  "width": 32,
  "height": 16,
  "frames": [ /* FrameRecord[] */ ]
}
```

**Response**

```json
{
  "id": "art_xxx",
  "createdAt": 1752500000000
}
```

#### 拉取作品（编辑态）

```http
GET /api/artworks/:id
```

**Response** — 返回完整分层 JSON（`ArtworkRecord`）

```json
{
  "id": "art_xxx",
  "name": "像素猫",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "currentFrameIndex": 0,
  "activeLayer": 0,
  "createdAt": 1752500000000,
  "updatedAt": 1752500000000,
  "authorId": "user_xxx",
  "tags": ["cat", "animation"],
  "visibility": "public",
  "likeCount": 42,
  "playCount": 128,
  "frames": [
    {
      "id": "frame_xxx",
      "index": 0,
      "delay": 120,
      "viewportX": 112,
      "viewportY": 120,
      "layers": [
        {
          "id": "layer_xxx",
          "name": "图层 1",
          "visible": true,
          "opacity": 1.0,
          "pixels": {
            "0,0": "#ffcc00",
            "1,0": "#ffcc00"
          }
        }
      ]
    }
  ]
}
```

#### 更新作品

```http
PUT /api/artworks/:id
Content-Type: application/json
```

请求体与 `POST` 相同，支持全量覆盖或增量更新。

#### 删除作品

```http
DELETE /api/artworks/:id
```

---

### 5.2 作品列表（元数据索引）

```http
GET /api/artworks?page=1&limit=20&sort=updatedAt&order=desc
```

**Response**

```json
{
  "total": 128,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": "art_xxx",
      "name": "像素猫",
      "thumbnailUrl": "https://cdn.example.com/art/art_xxx/thumb.png",
      "gifPreviewUrl": "https://cdn.example.com/art/art_xxx/preview.gif",
      "frameCount": 8,
      "totalDuration": 960,
      "width": 32,
      "height": 16,
      "authorId": "user_xxx",
      "authorName": "张三",
      "tags": ["cat", "animation"],
      "visibility": "public",
      "likeCount": 42,
      "playCount": 128,
      "createdAt": 1752500000000,
      "updatedAt": 1752500000000,
      "dominantColors": ["#ffcc00", "#00e436", "#29adff"]
    }
  ]
}
```

---

### 5.3 播放资源

```http
GET /api/artworks/:id/playback
```

**Response** — 播放态资源包（`ArtworkPlayback`）

```json
{
  "id": "art_xxx",
  "name": "像素猫",
  "width": 32,
  "height": 16,
  "totalDuration": 960,
  "gifUrl": "https://cdn.example.com/art/art_xxx/anim.gif",
  "thumbnails": [
    "data:image/png;base64,iVBORw0KGgo...",
    "data:image/png;base64,iVBORw0KGgo..."
  ],
  "frames": [
    {
      "index": 0,
      "delay": 120,
      "thumbnailData": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]
}
```

**思路**：编辑态 JSON 播放时需要 `compositeFrame()` 实时合成每帧。播放态直接提供 GIF / 帧缩略图，浏览器原生解码即可，零 CPU 消耗。

---

### 5.4 二进制资源上传

```http
PUT /api/artworks/:id/gif
Content-Type: image/gif

<binary gif data>
```

```http
PUT /api/artworks/:id/thumbnail
Content-Type: image/png

<binary png data>
```

---

### 5.5 帧级操作

#### 新增帧

```http
POST /api/artworks/:id/frames
Content-Type: application/json

{
  "delay": 120,
  "layers": [ /* LayerRecord[] */ ]
}
```

#### 更新单帧

```http
PUT /api/artworks/:id/frames/:frameId
Content-Type: application/json
```

#### 删除帧

```http
DELETE /api/artworks/:id/frames/:frameId
```

---

## 六、核心类型定义

### ArtworkRecord（编辑态完整记录）

```typescript
interface ArtworkRecord {
  /** 作品 ID */
  id: string
  /** 作品名称 */
  name: string
  /** 画布宽度（固定 32） */
  width: number
  /** 画布高度（固定 16） */
  height: number
  /** 总帧数 */
  frameCount: number
  /** 当前激活帧索引 */
  currentFrameIndex: number
  /** 当前激活图层索引 */
  activeLayer: number
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number

  // ── 后端管理字段 ──
  /** 作者 ID */
  authorId?: string
  /** 标签 */
  tags?: string[]
  /** 可见性 */
  visibility: 'public' | 'unlisted' | 'private'
  /** 点赞数 */
  likeCount?: number
  /** 播放数 */
  playCount?: number

  /** 帧列表 */
  frames: FrameRecord[]
}

interface FrameRecord {
  id: string
  /** 帧序号（后端排序用，不依赖数组顺序） */
  index: number
  /** 显示间隔（毫秒） */
  delay: number
  /** 视窗 X 偏移 */
  viewportX: number
  /** 视窗 Y 偏移 */
  viewportY: number
  /** 图层列表 */
  layers: LayerRecord[]
}

interface LayerRecord {
  id: string
  name: string
  visible: boolean
  opacity: number       // 0.1~1.0
  /** 稀疏像素：只存非空像素的坐标+颜色 */
  pixels: Record<string, string>   // "x,y" → "#rrggbb"
}
```

### ArtworkIndex（列表元数据）

```typescript
interface ArtworkIndex {
  id: string
  name: string
  /** 缩略图 URL */
  thumbnailUrl: string
  /** 循环 GIF 预览 URL（可选） */
  gifPreviewUrl?: string
  /** 总帧数 */
  frameCount: number
  /** 总时长（毫秒） */
  totalDuration: number
  width: number
  height: number
  authorId?: string
  authorName?: string
  /**
   * 作品标签分类
   */
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
  /**
   * 点赞数
   */
  likeCount: number
  /**
   * 播放数
   */
  playCount: number
  createdAt: number
  updatedAt: number
  /** 主色调（前 3 色），用于颜色筛选 */
  dominantColors: string[]
}
```

### ArtworkPlayback（播放资源包）

```typescript
interface ArtworkPlayback {
  id: string
  name: string
  width: number
  height: number
  /** 所有帧 delay 之和（毫秒） */
  totalDuration: number

  // ── 方案1：预渲染 GIF（最简单） ──
  /** 预渲染 GIF 地址（CDN） */
  gifUrl: string

  // ── 方案2：帧缩略图（支持逐帧控制） ──
  /** 每帧缩略图（base64 或 URL） */
  thumbnails: string[]
  frames: FrameThumbnail[]
}

interface FrameThumbnail {
  index: number
  delay: number
  /** base64 data URI 或 CDN URL */
  thumbnailData: string
  thumbnailUrl?: string
}
```

### 二进制编码 Header

```typescript
interface BinaryHeader {
  magic: 'PXA1'          // 4 bytes
  version: number        // 1 byte  (当前 1)
  width: number          // 1 byte  (固定 32)
  height: number         // 1 byte  (固定 16)
  frameCount: number     // 2 bytes
  layerCount: number     // 1 byte  (最多 4)
  flags: number          // 1 byte
  reserved: number       // 4 bytes
}
```

---

## 七、数据流转全景

```
                     ┌─────────────┐
                     │   前端编辑器   │
                     │ EditorView   │
                     └──────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
    ┌─────────▼──────┐          ┌─────────▼──────┐
    │   编辑态保存     │          │   导出/分享     │
    │  (编辑 + 二次加载)│          │  (GIF/PNG)     │
    └─────────┬──────┘          └─────────┬──────┘
              │                           │
    POST/PUT  │                   下载 Blob │
    /artworks │                           │
              ▼                           ▼
    ┌──────────────────┐          ┌──────────────┐
    │  ArtworkRecord   │          │  GIF / PNG   │
    │  (JSON, ~55KB)   │          │  (二进制文件)  │
    │  + 缩略图 + GIF   │          └──────────────┘
    └────────┬─────────┘               │
             │                         │ CDN / 直接下载
             │    ┌──────────┐         │
             └───▶│ 后端服务  │◀────────┘
                  │ /api/art │
                  └────┬─────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────▼──────┐         ┌──────▼──────┐
    │  编辑场景     │         │  播放/展示场景 │
    │ GET /:id    │         │ GET /:id/   │
    │ 返回完整 JSON │         │   playback  │
    └─────────────┘         └──────┬──────┘
                                  │
                         ┌────────▼──────┐
                         │  Artwork      │
                         │  Playback     │
                         │  (GIF URL +   │
                         │   帧缩略图)    │
                         └───────────────┘
```

---

## 八、接口总览

```
┌─────────┬──────────────────────────┬──────────────────────────────────┐
│ 方法    │ 路径                     │ 说明                              │
├─────────┼──────────────────────────┼──────────────────────────────────┤
│ POST    │ /artworks                │ 新建作品                          │
│ GET     │ /artworks                │ 列表（只含元数据+缩略图，分页）     │
│ GET     │ /artworks/:id            │ 编辑态（完整分层 JSON）            │
│ PUT     │ /artworks/:id            │ 更新作品（全量 or 增量）           │
│ DELETE  │ /artworks/:id            │ 删除作品                          │
│ PUT     │ /artworks/:id/gif        │ 上传 GIF 预渲染文件               │
│ PUT     │ /artworks/:id/thumbnail  │ 上传缩略图（PNG）                  │
│ GET     │ /artworks/:id/playback   │ 播放资源包（GIF URL + 帧缩略图）    │
│ GET     │ /artworks/:id/gif        │ 直接下载 GIF                      │
│ POST    │ /artworks/:id/frames     │ 新增帧                            │
│ PUT     │ /artworks/:id/frames/:fid│ 更新单帧                          │
│ DELETE  │ /artworks/:id/frames/:fid│ 删除帧                            │
└─────────┴──────────────────────────┴──────────────────────────────────┘
```

---

## 九、存储优化建议

| 优化方向 | 具体措施 | 效果 |
|---------|---------|------|
| **存储压缩** | `pixels` 从密集 `512 元素数组` → 稀疏 `Record<string, string>` | 减少 96%+ 体积 |
| **JSON 传输** | 后端 gzip/brotli 压缩 | 55 KB → 8~12 KB |
| **二次编辑无需重新上传 GIF** | 存分层数据，编辑后只增量同步变更的帧/图层 | 差分更新而非全量覆盖 |
| **播放态分离** | 编辑态 JSON + 播放态 GIF/帧缩略图两路资源 | 列表页秒开，编辑时全精度 |
| **缩略图预生成** | 后端服务端渲染第一帧 PNG（32×16 或放大版） | 列表页不解析 JSON 直接展示 |
| **GIF 预渲染** | 上传时后端 `encodeGif` 生成 GIF → CDN 托管 | 播放不消耗前端 CPU |
| **离线缓存** | IndexedDB 存编辑态 JSON + 播放态 GIF | 弱网下可编辑可播放 |
| **增量保存** | `touchProject` 改为 diff 对比后只 POST 变更的像素 | 每次保存几百 bytes 而非几十 KB |

**核心原则**：编辑和播放走两条路。编辑走分层 JSON（可回写、可 diff），播放走预渲染位图（GIF/PNG，浏览器原生播放）。两者在同一后端记录下共存，互不干扰。

---

## 十、上传与保存逻辑流程

### 10.1 总体架构

```
用户点击保存
    │
    ▼
handleSaveToOSS()  ── PixelEditor.vue
    │
    ├── Step 1: 上传可编辑 JSON（uploadPixelJSON）
    │       │
    │       ▼
    │   uploadeditorJson() → OSS（EDITABLE_JSON 类型）
    │       │
    │       └── 返回 editableFileUrl
    │
    ├── Step 2a: 从第一帧第一层上传像素数据（uploadDoodle）— 原有逻辑，保留兼容
    │       │
    │       ▼
    │   uploadDoodle(firstFrame.layers[0].pixels)
    │       │
    │       ├── colorsToJsonBlob()  →  OSS（STATIC_BIN / doodle.json）
    │       ├── convertHexArrayToPng() →  OSS（STATIC_BIN / doodle.png）
    │       └── colorsToBlob()       →  OSS（STATIC_BIN / img.bin）
    │           │
    │           └── 返回 binFileUrl / cover / binSize
    │
    ├── Step 2b: 静态图（1帧）— 用当前选中帧的合并像素覆盖 binFileUrl
    │       │
    │       ▼（仅在 frames.length === 1 时执行）
    │   compositeFrame(currentFrame) → 合并所有图层 → 512 像素数组
    │       │
    │       ▼
    │   uploadDoodle(compositedPixels)  →  同上，走 STATIC_BIN
    │       │
    │       └── 覆盖 binFileUrl / binSize（RGB565 二进制，固定 1024 字节）
    │
    ├── Step 2c: 动图（>1帧）— 编码 GIF 并上传
    │       │
    │       ▼（仅在 frames.length > 1 时执行）
    │   project.frames.map(frame → compositeFrame(frame))
    │       │   每帧 layers 实时 alpha 混合 → 512 像素数组
    │       ▼
    │   encodeGif({ width, height, scale:1, frames })
    │       │   输出 Blob（image/gif）
    │       ▼
    │   uploadGif(gifBlob)  →  OSS（GIF_FILE 类型 / jeejio.gif）
    │       │
    │       └── 返回 gifFileUrl / gifFileSize（实际 GIF 文件大小）
    │
    ├── Step 3: 组装 CreatorWorkSaveRequest 并创建/更新作品
    │       │
    │       ├── isGif = frames.length > 1
    │       ├── 静态图：type=STATIC，binFileUrl=远程URL，binFileSize=1024
    │       └── 动图：type=GIF，gifFileUrl=远程URL，gifFileSize=实际大小
    │       │
    │       ▼
    │   editingWorkId ? updateWorkApi() : createWorkApi()
    │
    └── Step 4: 跳转作品列表页
```

### 10.2 关键文件与函数

| 文件 | 函数 | 职责 |
|------|------|------|
| `PixelEditor.vue` | `handleSaveToOSS()` | 保存总入口，编排 Step 1~3 |
| `uploadFile.ts` | `uploadPixelJSON(data)` | 将 projectData 序列化为 JSON 上传 |
| `uploadFile.ts` | `uploadDoodle(colors)` | 将 512 像素数组转 RGB565 + PNG + JSON 三元上传 |
| `uploadFile.ts` | `uploadGif(blob)` | 将 GIF Blob 上传到 OSS |
| `rgb.ts` | `colorsToBlob(colors)` | 512 颜色数组 → RGB565 Uint8Array → Blob（1024 字节） |
| `rgb.ts` | `colorsToJsonBlob(colors)` | 512 颜色数组 → JSON Blob |
| `rgb.ts` | `convertHexArrayToPng(colors)` | 512 颜色数组 → 64×16 PNG Blob |
| `rgb.ts` | `convertToRGB565(hex)` | 单个 hex 颜色 → RGB565 整数 |
| `gif-encoder.ts` | `encodeGif(options)` | 多帧像素数据 → GIF89a Blob |
| `core/index.ts` | `compositeFrame(frame)` | 将 frame 的所有 layers alpha 混合 → 512 像素密集数组 |
| `image-import.ts` | `renderImageToPixels(image, opts)` | 图片 → 像素数组（支持 dithering / preserveColors） |
| `AliOSS.ts` | `createOssClient(type)` | 根据类型获取 OSS STS 凭证和客户端 |

### 10.3 静态图 vs 动图 上传差异

| 维度 | 静态图（1帧） | 动图（>1帧） |
|------|------------|------------|
| **像素数据** | `compositeFrame(currentFrame)` 512px | 每帧 `compositeFrame(frame)` → 512px × N |
| **GIF 编码** | ❌ 不编码 | ✅ `encodeGif()` 合成 GIF Blob |
| **GIF 上传** | ❌ | ✅ `uploadGif(gifBlob)` → `GIF_FILE` |
| **binFileUrl** | `uploadDoodle` → `STATIC_BIN` / `img.bin` | 不传（用 gifFileUrl 代替） |
| **binFileSize** | `1024`（固定，512×2 字节） | `undefined` |
| **gifFileSize** | `undefined` | GIF Blob 实际大小 |
| **works 接口 type** | `STATIC` | `GIF` |
| **上传 OSS 类型** | `STATIC_BIN` | `GIF_FILE` |

### 10.4 OSS 上传类型说明

| 类型常量 | OSS role | 文件命名 | 用途 |
|---------|---------|---------|------|
| `COVER_IMAGE` | `COVER_IMAGE` | 原始文件名 | 封面图（原始图片） |
| `STATIC_BIN` | `STATIC_BIN` | `img.bin` / `doodle.png` / `doodle.json` | RGB565 二进制 + 预览 PNG + 像素 JSON |
| `EDITABLE_JSON` | `EDITABLE_JSON` | `{项目名}.json` | 完整可编辑项目数据 |
| `GIF_FILE` | `GIF_FILE` | `jeejio.gif` | GIF 动图文件 |

### 10.5 RGB565 二进制格式

```
像素数组（512 个 hex 颜色）
    │
    ▼ colorsToBlob()
    │
Uint8Array[1024]  ←  512 × 2 字节
    │
    ├── [0]  = 第 1 像素高字节  (rgb565 >>> 8) & 0xff
    ├── [1]  = 第 1 像素低字节  rgb565 & 0xff
    ├── [2]  = 第 2 像素高字节
    ├── [3]  = 第 2 像素低字节
    │   ...
    └── [1023] = 第 512 像素低字节

RGB565 编码公式：
  r5 = R(8bit) >> 3   → 5 bits
  g6 = G(8bit) >> 2   → 6 bits
  b5 = B(8bit) >> 3   → 5 bits
  rgb565 = (r5 << 11) | (g6 << 5) | b5
```

### 10.6 像素数据约束

| 项目 | 值 |
|------|-----|
| 像素网格尺寸 | `WIDTH × HEIGHT = 32 × 16` |
| 像素总数 | `PIXELS = 512` |
| 画布显示尺寸 | `CANVAS_WIDTH × CANVAS_HEIGHT = 256 × 256` |
| 调色板 | 24 色 PICO-8 风格 |
| 空像素值 | `null`（JSON） / `#CACACA`（二进制兜底） |
| JSON 像素数组长度 | **必须为 512**（若为 65536 则错误地用了 CANVAS 尺寸） |

### 10.7 前端图片上传流程（works/index.vue）

#### 静态图上传（handleStaticImageUpload）

```
用户选择图片文件
    │
    ▼
imageFromFile(file)          ← 解码图片 → HTMLImageElement
    │
    ▼
renderImageToPixels(image, {   ← outputWidth: WIDTH(32), outputHeight: HEIGHT(16)
    preserveColors: true       → 输出 512 像素数组
})
    │
    ▼
构造 projectData（1 帧 1 层，pixels: 512 元素数组）
    │
    ▼
uploadStaticImageWithJson(file, projectData)
    │
    ├── uploadFile(file, 'COVER_IMAGE')           → 原始图片上传
    ├── convertImageToRGB565(file)                → RGB565 Blob
    │       └── uploadFile(rgb565Blob, 'img.bin') → STATIC_BIN
    ├── convertRgb565BlobToPng(rgb565Blob)        → 64×16 PNG Blob
    │       └── uploadFile(pngBlob, name, 'STATIC_BIN')
    └── uploadPixelJSON(projectData)              → EDITABLE_JSON
    │
    ▼
createWorkApi(workData)  →  type=STATIC, binFileUrl, binFileSize=1024
    │
    ▼
fetchWorks() 刷新列表
```

#### GIF 上传（handleFileUpload → GIF 分支）

```
用户选择 GIF 文件
    │
    ▼
decodeGifFrames(file)         ← 解码 GIF → [{ image, delay }]
    │
    ▼
framesData = gifFrames.map(frame → ({
    delay, pixels: renderImageToPixels(image)   // 每帧 512 像素
}))
    │
    ▼
uploadGifWithFrames(file, framesData)
    │
    ├── uploadPixelJSON(projectData)   → EDITABLE_JSON（含所有帧 layers）
    └── uploadGif(file)               → GIF_FILE
    │
    ▼
createWorkApi(workData)  →  type=GIF, gifFileUrl, gifFileSize=实际大小
    │
    ▼
fetchWorks() 刷新列表
```

### 10.8 编辑器内保存流程（PixelEditor.vue → handleSaveToOSS）

```
编辑器内点击保存
    │
    ▼
handleSaveToOSS()
    │
    ├── Step 1: uploadPixelJSON(projectData)
    │       └── 上传完整项目 JSON → EDITABLE_JSON
    │
    ├── Step 2a: uploadDoodle(firstFrame.layers[0].pixels)  ← 原有逻辑
    │       └── 第一帧第一层像素 → STATIC_BIN（img.bin + doodle.png + doodle.json）
    │
    ├── Step 2b: 静态图（frames.length === 1）
    │       ├── compositeFrame(currentFrame)  → 当前帧所有图层混合 → 512px
    │       └── uploadDoodle(compositedPixels) → 覆盖 binFileUrl / binSize
    │
    ├── Step 2c: 动图（frames.length > 1）
    │       ├── 所有帧 compositeFrame → 512px 数组
    │       ├── encodeGif() → GIF Blob
    │       └── uploadGif(gifBlob) → GIF_FILE → 覆盖 coverUrl / gifFileSize
    │
    └── createWorkApi / updateWorkApi
            ├── STATIC: type=STATIC, binFileUrl=远程URL, binFileSize=1024
            └── GIF:    type=GIF,    gifFileUrl=远程URL, gifFileSize=实际大小
```

### 10.9 注意事项

1. **像素数组长度必须为 512**：`renderImageToPixels` 的 `outputWidth/outputHeight` 必须传 `WIDTH/HEIGHT`（32×16），不能传 `CANVAS_WIDTH/CANVAS_HEIGHT`（256×256 = 65536）

2. **null 像素处理**：
   - JSON 中保留 `null`（表示透明/空像素）
   - 转 RGB565 二进制时，`null` → `#CACACA`（默认灰色），避免位运算出错

3. **静态图 binFileSize 固定 1024**：因为 RGB565 是 512 像素 × 2 字节/像素 = 1024 字节

4. **GIF 的 gifFileSize 取实际值**：来自 `uploadGif` 返回的 Blob 大小，不混用 binFileSize

5. **Oss 凭证按类型隔离**：`COVER_IMAGE` / `STATIC_BIN` / `EDITABLE_JSON` / `GIF_FILE` 四种类型走不同的 OSS 路径和 STS 凭证

6. **编辑保存 vs 首次上传**：
   - `handleSaveToOSS()`（编辑器内保存）：走 `uploadDoodle` + `encodeGif` + `uploadGif`
   - `handleStaticImageUpload()`（works 页面上传）：走 `uploadStaticImageWithJson`
   - 两者最终都通过 `createWorkApi` / `updateWorkApi` 写入后端

---

## 十一、自动保存机制

### 11.1 触发方式

```
用户进入编辑器
    │
    ▼
onMounted → setInterval(doSilentSave, 30s)
    │
    ▼ 每 30 秒
doSilentSave()
    │
    ├── [1] blankWorkChecked: false  → 首次检查 isValidWork()
    │       ├── isValidWork() = false  → 返回 false（跳过，不提示）
    │       └── isValidWork() = true   → blankWorkChecked = true，继续
    │
    ├── [2] blankWorkChecked: true  → 跳过空白检查
    │
    ├── [3] hasChangesSinceLastSave()
    │       ├── updatedAt <= lastSaveTimestamp  → 返回 false（跳过）
    │       └── updatedAt > lastSaveTimestamp   → 继续
    │
    ├── [4] saving.value === true  → 手动保存中，跳过
    │
    ├── [5] saveOSSOnly()
    │       ├── 上传 JSON（EDITABLE_JSON）
    │       ├── 上传像素（STATIC_BIN）
    │       ├── 创建 / 更新作品（createWorkApi / updateWorkApi）
    │       └── lastSaveTimestamp = Date.now()
    │
    └── [6] 更新状态栏
            ├── autoSaveFirstDone = false  → "已自动保存"
            └── autoSaveFirstDone = true   → "上次保存 14:32"
```

### 11.2 页面离开前保存

```
用户关闭 / 刷新 / 导航离开
    │
    ▼
onBeforeUnmount
    │
    ├── doSilentSave()          ← 静默保存一次（异步，不阻塞）
    │
    ├── removeEventListener     ← 清理键盘事件
    │
    └── clearInterval           ← 清理定时器
```

### 11.3 有效作品判定（isValidWork）

遍历所有帧的所有可见图层的 pixels 数组：
- 只要 **任何一个像素** `p != null && p !== '' && p !== EMPTY` → 有效
- 全部为 null/空 → 无效（跳过保存）

### 11.4 变化检测（hasChangesSinceLastSave）

```
首次保存：lastSaveTimestamp = 0 → 返回 true（视为有变化）
后续：project.updatedAt > lastSaveTimestamp → 有变化
      project.updatedAt <= lastSaveTimestamp → 无变化，跳过
```

### 11.5 提示策略

| 场景 | 处理 |
|------|------|
| 首次自动保存成功 | 状态栏弱提示"已自动保存"（`status.value`），不弹 toast |
| 后续自动保存成功 | 状态栏"上次保存 HH:mm"（`status.value`），不弹 toast |
| 自动保存失败 | 状态栏弱提示"自动保存失败，将重试"，不弹 toast，下次轮询自动重试 |
| 手动保存成功 | 状态栏 + ElMessage.success toast |
| 手动保存失败 | 状态栏 + ElMessage.error toast |
| 空白作品 | 跳过，不提示 |
| 无变化 | 跳过，不提示 |

### 11.6 状态字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `autoSaveTimer` | `number \| null` | 定时器 ID，`setInterval` 返回 |
| `AUTO_SAVE_INTERVAL` | `30 * 1000` | 保存间隔 30 秒 |
| `lastSaveTimestamp` | `number` | 上次成功保存的时间戳 |
| `autoSaveFirstDone` | `boolean` | 是否已完成首次自动保存 |
| `blankWorkChecked` | `boolean` | 是否已检查过空白作品（首次之后跳过检查） |

### 11.7 关键函数

| 函数 | 职责 |
|------|------|
| `isValidWork()` | 遍历所有帧图层，检测是否有绘制内容 |
| `hasChangesSinceLastSave()` | 对比 `updatedAt` 和 `lastSaveTimestamp` |
| `doSilentSave()` | 自动保存入口：过滤条件 → `saveOSSOnly()` → 更新状态 |
| `saveOSSOnly()` | 纯上传逻辑（无 UI 提示），供自动保存和手动保存共用 |
| `handleSaveToOSS()` | 手动保存入口：`saving` 状态 + `saveOSSOnly()` + toast |

### 11.8 注意事项

1. **不重置倒计时**：编辑时不重置 30 秒倒计时，避免用户频繁操作导致一直不保存
2. **手动保存时跳过自动保存**：`saving.value === true` 时自动保存直接跳过
3. **创建 workId 后自动保存也能正确更新**：`saveOSSOnly` 内部走 `updateWorkApi`（`editingWorkId` 已通过手动保存的 `createWorkApi` 返回赋值）
4. **离开页面不等待保存完成**：`onBeforeUnmount` 的 `doSilentSave()` 是 fire-and-forget，不阻塞页面跳转

## 图片的数据结构：存储帧内容
### 数据内容：
```
{"id":"project_mrinohls_vrorfk","version":4,"name":"Untitled Pixel Art","width":32,"height":16,"currentFrameIndex":1,"activeLayer":0,"frames":[{"id":"frame_mrkg5w9b_sdb5u1","delay":120,"viewportX":112,"viewportY":120,"layers":[{"id":"layer_mrkg5w9b_2wlnkz","name":"图层 1","visible":true,"opacity":1,"pixels":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]},{"id":"layer_mrkg5w9b_iea0o1","name":"图层 2","visible":true,"opacity":1,"pixels":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]},{"id":"frame_mrkg640i_3nu2x3","delay":100,"viewportX":112,"viewportY":120,"layers":[{"id":"layer_mrkg640i_r25olg","name":"图层 1","visible":true,"opacity":1,"pixels":["#484855","#6c4855","#484855","#484855","#484855","#484855","#484855","#6c6c55","#6c6c55","#6c6c55","#6c6c55","#484855","#242455","#484855","#482455","#484855","#6c6c55","#6c6c55","#6c6c55","#6c6c55","#242455","#242455","#242400","#000000","#000000","#242400","#242400","#242400","#242400","#000000","#000000","#000000","#484855","#484855","#484800","#484800","#484800","#484800","#484800","#484855","#484855","#484855","#6c6caa","#6c6c55","#6c6c55","#b4b4aa","#d8d8aa","#fcfcaa","#fcfcff","#fcfcff","#fcd8ff","#d8d8ff","#909055","#6c6c55","#6c6c55","#484855","#484800","#242455","#000055","#000055","#000055","#242400","#242400","#240000","#484855","#4848aa","#484800","#484800","#484800","#242400","#484800","#484855","#4848aa","#484855","#6c6caa","#6c6c55","#909055","#d8d8aa","#fcfcaa","#fcfcff","#fcfcff","#fcfcff","#fcfcff","#d8d8ff","#909055","#6c6c55","#6c6c55","#484800","#484800","#000055","#000055","#000000","#242455","#242400","#000000","#242400","#000055","#002455","#242400","#242400","#242400","#242400","#242400","#242455","#244855","#484855","#484855","#484855","#6c6c55","#909055","#b4b4aa","#d8b4aa","#b4b4ff","#b4b4ff","#b4b4aa","#9090aa","#6c6c55","#484855","#484855","#484800","#484800","#242455","#484855","#484855","#484855","#484800","#484800","#484800","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000055","#242455","#484800","#484800","#484855","#6c6c55","#909055","#6c6caa","#9090aa","#9090aa","#9090aa","#6c6c55","#6c6c55","#484855","#482400","#242400","#242455","#242455","#242455","#242455","#484800","#484800","#484800","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#242400","#484855","#242455","#242455","#484855","#484800","#242400","#482400","#484800","#482400","#242455","#242455","#242455","#242455","#484800","#484800","#484800","#242400","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#000055","#000000","#000055","#242455","#242455","#484855","#6c6c55","#484855","#6c6c55","#484855","#242455","#242455","#242455","#242455","#484800","#484800","#484800","#484855","#242455","#242455","#242455","#000000","#242400","#000000","#000000","#000000","#000000","#000000","#002400","#242400","#242400","#242400","#000000","#000000","#242400","#242455","#484855","#6c6c55","#6c6c55","#906c55","#906c55","#6c4855","#484855","#484855","#242455","#242455","#484800","#484800","#484800","#484800","#242455","#242455","#242455","#242400","#242400","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#000055","#242400","#242455","#242455","#242455","#6c6c55","#6c6c55","#6c6c55","#6c6c55","#484855","#484855","#484855","#242455","#242455","#484800","#484800","#484800","#484855","#242455","#242455","#242455","#002400","#242400","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#002400","#242400","#000000","#000000","#000000","#000000","#242400","#242400","#484800","#484855","#484855","#242455","#242455","#242455","#242455","#242455","#484800","#484800","#484855","#484800","#242455","#242455","#242455","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#242400","#242455","#242455","#242455","#242455","#482400","#242400","#242400","#242400","#242400","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#240000","#240000","#240000","#240000","#240000","#240000","#240000","#000000","#000000","#000000","#000000","#000000","#240000","#240000","#240000","#240000","#240000","#000000","#000000","#000000","#240000","#240000","#240000","#240000","#240000","#000000","#240000","#240000","#240000","#240000","#240000","#240000","#b40000","#d82400","#6c0000","#d80055","#900000","#900000","#b40055","#900000","#d82400","#900000","#900000","#900000","#6c0000","#900055","#6c0000","#6c0000","#b40000","#900000","#b40000","#b40000","#6c0000","#b40000","#900000","#900000","#b40055","#900000","#d82400","#d80000","#b40000","#b40055","#900000","#b40055"]},{"id":"layer_mrkg640i_lcnihp","name":"图层 2","visible":true,"opacity":1,"pixels":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]},],"createdAt":1783912898080,"updatedAt":1784021216151}




```

---

## 十二、实际 API 接口文档（后端实现）

> 以下为代码库中实际实现的 API 接口，对应文件：`src/api/works.ts`、`src/api/device.ts`、`src/lib/images/uploadFile.ts`

---

### 12.1 作品管理 API

#### 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/creator/works` | 分页查询我的作品 |
| `GET` | `/creator/works/{id}` | 查询作品详情 |
| `POST` | `/creator/works` | 创建作品 |
| `PUT` | `/creator/works/{id}` | 更新作品 |
| `DELETE` | `/creator/works/{id}` | 删除作品 |
| `POST` | `/creator/works/upload-token` | 获取 OSS 上传凭证 |
| `GET` | `/creator/works/releases` | 分页查询发布管理列表（含统计） |
| `GET` | `/creator/works/release-candidates` | 分页查询可发布作品列表 |

---

#### `GET /creator/works` — 分页查询我的作品

```typescript
// src/api/works.ts:152
function pageWorksApi(params: CreatorWorkPageRequest)
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageNumber` | `number` | 是 | 页码 |
| `pageSize` | `number` | 是 | 每页数量 |
| `keyword` | `string` | 否 | 关键词搜索 |
| `sortBy` | `"CREATED_AT" \| "LAST_VIEW_TIME" \| "TITLE"` | 否 | 排序字段 |
| `direction` | `"ASC" \| "DESC"` | 否 | 排序方向 |

**响应**：`PageResult<CreatorWorkVO>`

---

#### `GET /creator/works/{id}` — 查询作品详情

```typescript
// src/api/works.ts:164
function getWorkDetailApi(id: string)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 作品 ID |

**响应**：`CreatorWorkVO`

**关键用途**：
- 进入编辑器时通过此接口获取 `editableFileUrl`，用于加载可编辑的 JSON 像素数据
- 获取 `binFileUrl` / `gifFileUrl`，用于设备预览推送
- 完整作品数据包含所有帧、图层、像素信息

---

#### `POST /creator/works` — 创建作品

```typescript
// src/api/works.ts:175
function createWorkApi(data: CreatorWorkSaveRequest)
```

**请求体**：`CreatorWorkSaveRequest`

**响应**：`string`（新作品 ID）

---

#### `PUT /creator/works/{id}` — 更新作品

```typescript
// src/api/works.ts:187
function updateWorkApi(id: string, data: CreatorWorkSaveRequest)
```

**响应**：`void`

---

#### `DELETE /creator/works/{id}` — 删除作品

```typescript
// src/api/works.ts:199
function deleteWorkApi(id: string)
```

**响应**：`void`

---

#### `POST /creator/works/upload-token` — 获取 OSS 上传凭证

```typescript
// src/api/works.ts:276
function getWorkUploadTokenApi(role: FileRole, fileName?: string, fileSize?: number)
```

**`FileRole` 枚举**

| 枚举值 | OSS Role | 文件命名 | 用途 |
|--------|---------|---------|------|
| `"COVER_IMAGE"` | `COVER_IMAGE` | 原始文件名 | 封面图（原始图片） |
| `"GIF_FILE"` | `GIF_FILE` | `jeejio.gif` | GIF 动图文件 |
| `"EDITABLE_JSON"` | `EDITABLE_JSON` | `{项目名}.json` | 可编辑 JSON 配置 |
| `"STATIC_BIN"` | `STATIC_BIN` | `img.bin` / `doodle.png` / `doodle.json` | RGB565 二进制 + 预览 + 像素数据 |

**响应**：`OSSTokenFullVO`

```typescript
interface OSSTokenFullVO {
  endpoint: string;       // OSS 端点
  region: string;         // 区域
  bucketName: string;     // Bucket 名称
  accessKeyId: string;    // 访问密钥 ID
  accessKeySecret: string;// 访问密钥
  expiration: string;     // 过期时间
  token: string;          // STS Token
  requestId?: string;     // 请求 ID
  path?: string;          // OSS 上传路径前缀
  fullPath?: string;      // 完整路径前缀
}
```

---

### 12.2 设备管理 API

#### 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/creator/devices` | 分页查询我的设备列表 |
| `GET` | `/creator/devices?pageNumber=1&pageSize=999` | 查询所有设备（不分页） |
| `POST` | `/creator/preview` | 预览推送资源到设备 |

---

#### `GET /creator/devices` — 查询设备列表

```typescript
// src/api/device.ts:63
function listDevicesApi()
```

**响应**：`CreatorDeviceVO[]`

```typescript
interface CreatorDeviceVO {
  id: string;
  name: string;
  sn?: string;
  online: "ONLINE" | "OFFLINE";
  productId?: string;
  productName?: string;
  lastOnlineTime?: number;
  lastBindTime?: number;
  firmwareVersion?: string;
}
```

---

#### `POST /creator/preview` — 预览推送资源到设备

```typescript
// src/api/device.ts:75
function previewToDeviceApi(data: CreatorPreviewRequest)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `deviceIds` | `string[]` | 是 | 目标设备 ID 列表 |
| `type` | `"STATIC" \| "GIF"` | 是 | 文件类型 |
| `fileUrl` | `string` | 是 | 文件 OSS 地址（见下方规则） |
| `fileSize` | `number` | 是 | 文件大小（字节） |

**`fileUrl` 选择规则**：

```
type === "STATIC"  → 使用 work.binFileUrl
type === "GIF"     → 使用 work.gifFileUrl
```

**响应**：`CreatorPreviewResultVO[]`

```typescript
interface CreatorPreviewResultVO {
  success: boolean;
  deviceId: string;
  deviceName: string;
  message?: string;   // 失败时返回错误原因
}
```

---

### 12.3 文件上传模块

#### `uploadPixelJSON(data)` — 上传像素编辑器 JSON 配置

```typescript
// src/lib/images/uploadFile.ts:144
function uploadPixelJSON(data: any): Promise<{
  originData: any;
  fileUrl: string;   // OSS 地址 → 赋值给 CreatorWorkSaveRequest.editableFileUrl
  fileSize: number;
}>
```

- 将项目数据序列化为 JSON
- OSS Role：`EDITABLE_JSON`
- 文件名：`{项目名}.json`

---

#### `uploadDoodle(colors)` — 上传静态涂鸦像素数据

```typescript
// src/lib/images/uploadFile.ts:366
function uploadDoodle(colors: Array<string | null>): Promise<{
  fileUrl: string;   // JSON 格式像素地址
  fileSize: number;
  binFileUrl: string; // RGB565 二进制地址 → 赋值给 CreatorWorkSaveRequest.binFileUrl
  binSize: number;
  cover: string;     // PNG 预览地址 → 赋值给 CreatorWorkSaveRequest.coverUrl
}>
```

**上传内容（一次调用产生 3 个文件）**：

| 产物 | OSS Role | 文件名 | 赋值给 |
|------|---------|--------|--------|
| JSON Blob | `STATIC_BIN` | `doodle.json` | `fileUrl` |
| PNG 预览 | `STATIC_BIN` | `doodle.png` | `cover` |
| RGB565 二进制 | `STATIC_BIN` | `img.bin` | `binFileUrl` |

---

#### `uploadGif(blob)` — 上传 GIF 动图文件

```typescript
// src/lib/images/uploadFile.ts:397
function uploadGif(file: Blob | File): Promise<{
  fileUrl: string;   // GIF 地址 → 赋值给 CreatorWorkSaveRequest.gifFileUrl
  fileSize: number;
  cover: string;     // GIF 文件本身即封面 → 赋值给 CreatorWorkSaveRequest.coverUrl
}>
```

- OSS Role：`GIF_FILE`
- 文件名：`jeejio.gif`

---

#### `uploadStaticImageWithJson(file, projectData)` — 静态图 + JSON 一键上传

```typescript
// src/lib/images/uploadFile.ts:310
function uploadStaticImageWithJson(
  file: File,
  projectData: object
): Promise<{
  coverUrl: string;       // PNG 预览地址
  binFileUrl: string;     // RGB565 二进制地址
  binFileSize: number;
  editableFileUrl: string; // JSON 配置地址
}>
```

**上传内容**：注意这里错误了，，，，

| 步骤 | 产物 | OSS Role | 返回字段 |
|------|------|---------|---------|
| 1 | 原始图片 | `COVER_IMAGE` | — |
| 2 | RGB565 二进制 | `STATIC_BIN` | `binFileUrl` |
| 3 | PNG 预览（32×16） | `STATIC_BIN` | `coverUrl` |
| 4 | JSON 配置 | `EDITABLE_JSON` | `editableFileUrl` |

---

#### `uploadGifWithFrames(file, framesData)` — GIF + 帧数据一键上传

```typescript
// src/lib/images/uploadFile.ts:422
function uploadGifWithFrames(
  file: File,
  framesData: Array<FrameData>
): Promise<AddArtifactParam>
```

**上传内容**：

| 步骤 | 产物 | OSS Role | 返回字段 |
|------|------|---------|---------|
| 1 | GIF 文件 | `GIF_FILE` | `fileUrl` / `cover` |
| 2 | JSON 配置（含所有帧像素） | `EDITABLE_JSON` | `binFileUrl`（复用此字段指向 JSON） |

---

### 12.4 数据流转与 URL 获取全景

#### 保存时 URL 生成

```
handleSaveToOSS()                        ← PixelEditor.vue:1520
  │
  ├── uploadPixelJSON(projectData)       → editableFileUrl
  │     └── OSS Role: EDITABLE_JSON
  │
  ├── uploadDoodle(pixels)               → binFileUrl + coverUrl
  │     └── OSS Role: STATIC_BIN
  │     └── [仅静态图/第一帧兼容逻辑使用]
  │
  ├── [静态图] compositeFrame() + uploadDoodle() → 覆盖 binFileUrl
  │     └── frames.length === 1 时执行
  │
  ├── [动图] encodeGif() + uploadGif()   → gifFileUrl + coverUrl
  │     └── frames.length > 1 时执行
  │
  └── createWorkApi / updateWorkApi
        ├── STATIC: type=STATIC, binFileUrl=URL, binFileSize=1024
        └── GIF:    type=GIF,    gifFileUrl=URL, gifFileSize=实际大小
```

#### 进入编辑器时 URL 获取

```
loadWorkForEdit(workId)                  ← PixelEditor.vue:1605
  │
  ├── getWorkDetailApi(workId)           → CreatorWorkVO
  │     ├── editingWork.value.editableFileUrl  → fetchJsonFromUrl() 加载像素数据
  │     ├── editingWork.value.binFileUrl        → 静态图二进制地址
  │     └── editingWork.value.gifFileUrl        → 动图地址
  │
  └── 构建 project → 渲染编辑器
```

#### 预览推送时 URL 使用

```
sendWorkToDevice()                       ← PixelEditor.vue:1552
  │
  ├── listDevicesApi()                   → 获取设备列表
  │
  ├── 读取用户选中的设备（sessionStorage）
  │
  └── previewToDeviceApi({
        type:   work.type,               // "STATIC" 或 "GIF"
        fileUrl: work.binFileUrl          // STATIC 类型用
               | work.gifFileUrl,         // GIF 类型用
        fileSize: work.binFileSize        // STATIC 类型用（=1024）
               | work.gifFileSize,        // GIF 类型用
      })
```

---

### 12.5 `CreatorWorkSaveRequest` 各 URL 字段说明

| 字段 | 类型 | 写入场景 | 读取场景 |
|------|------|---------|---------|
| `editableFileUrl` | `string` | `uploadPixelJSON()` 返回 | `loadWorkForEdit()` 加载编辑数据 |
| `coverUrl` | `string` | `uploadDoodle()` / `uploadGif()` 返回 | 作品列表封面展示 |
| `binFileUrl` | `string` | 静态图：`uploadDoodle()` 返回 | 静态图预览推送 (`previewToDeviceApi`) |
| `binFileSize` | `number` | 静态图：固定 `1024`（512像素 × 2字节） | 静态图推送时传 fileSize |
| `gifFileUrl` | `string` | 动图：`uploadGif()` 返回 | 动图预览推送 (`previewToDeviceApi`) |
| `gifFileSize` | `number` | 动图：GIF Blob 实际大小 | 动图推送时传 fileSize |

> **互斥规则**：`binFileUrl` 与 `gifFileUrl` **不会同时有值**。
> - 单帧作品（`type === "STATIC"`）：`binFileUrl` 有值，`gifFileUrl = undefined`
> - 多帧作品（`type === "GIF"`）：`gifFileUrl` 有值，`binFileUrl = undefined`
