export interface CreatorWorkTagDefault {
  name: string;
  tagCode: string;
  sortOrder: number;
  enabled: boolean;
}

export const DEFAULT_CREATOR_WORK_TAGS: ReadonlyArray<CreatorWorkTagDefault> = [
  { tagCode: 'ORIGINAL', name: '原创作品', sortOrder: 10, enabled: true },
  { tagCode: 'ANIMATION', name: '动态作品', sortOrder: 20, enabled: true },
  { tagCode: 'STATIC', name: '静态作品', sortOrder: 30, enabled: true },
  { tagCode: 'PIXEL_ART', name: '像素艺术', sortOrder: 40, enabled: true },
  { tagCode: 'GAME_ASSET', name: '游戏素材', sortOrder: 50, enabled: true },
  { tagCode: 'CHARACTER', name: '角色设计', sortOrder: 60, enabled: true },
  { tagCode: 'SCENE', name: '场景设计', sortOrder: 70, enabled: true },
  { tagCode: 'OTHER', name: '其他', sortOrder: 80, enabled: true },
];
