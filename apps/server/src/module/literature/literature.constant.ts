/**
 * 文学编辑室 - 常量定义
 */

/** 文稿状态 */
export const ManuscriptStatus = {
  /** 草稿箱 */
  DRAFT: '0',
  /** 正式稿件 */
  PUBLISHED: '1',
  /** 归档稿件 */
  ARCHIVED: '2',
  /** 回收站 */
  RECYCLE: '3',
} as const;

/** 素材类型 */
export const MaterialType = {
  /** 短句 */
  SHORT_PHRASE: '0',
  /** 金句 */
  GOLDEN_QUOTE: '1',
  /** 典故 */
  ALLUSION: '2',
} as const;

/** 编辑室设置 - 自动保存开关 */
export const AutosaveSwitch = {
  OFF: '0',
  ON: '1',
} as const;

/** 默认导出格式 */
export const ExportFormat = {
  MD: 'md',
  PDF: 'pdf',
} as const;
