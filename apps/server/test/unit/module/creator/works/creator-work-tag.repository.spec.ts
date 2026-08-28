import { CreatorWorkTagRepository } from 'src/module/creator/works/repositories/creator-work-tag.repository';

interface WorkTagRow {
  id: string;
  name: string;
  tagCode: string;
  enabled: boolean;
  sortOrder: number;
}

describe('CreatorWorkTagRepository', () => {
  it('preserves existing classifications and adds every missing default classification', async () => {
    const rows: WorkTagRow[] = [
      { id: 'existing-original', name: '我的原创分类', tagCode: 'ORIGINAL', enabled: true, sortOrder: 1 },
      { id: 'existing-custom', name: '自定义分类', tagCode: 'CUSTOM', enabled: true, sortOrder: 2 },
    ];
    const creatorWorkTag = {
      createMany: jest.fn(async ({ data }: { data: Omit<WorkTagRow, 'id'>[] }) => {
        for (const tag of data) {
          if (!rows.some((row) => row.tagCode === tag.tagCode)) {
            rows.push({ id: `generated-${tag.tagCode}`, ...tag });
          }
        }
        return { count: rows.length - 2 };
      }),
      findMany: jest.fn(async () =>
        rows
          .filter((row) => row.enabled)
          .sort((left, right) => left.sortOrder - right.sortOrder || left.tagCode.localeCompare(right.tagCode))
          .map(({ id, name, tagCode }) => ({ id, name, tagCode })),
      ),
    };
    const repository = new CreatorWorkTagRepository({ creatorWorkTag } as never);

    await repository.onModuleInit();
    await repository.onModuleInit();
    const result = await repository.findEnabled();

    expect(result).toHaveLength(9);
    expect(result.map((tag) => tag.tagCode)).toEqual(
      expect.arrayContaining([
        'ORIGINAL',
        'ANIMATION',
        'STATIC',
        'PIXEL_ART',
        'GAME_ASSET',
        'CHARACTER',
        'SCENE',
        'OTHER',
        'CUSTOM',
      ]),
    );
    expect(result.find((tag) => tag.tagCode === 'ORIGINAL')).toEqual({
      id: 'existing-original',
      name: '我的原创分类',
      tagCode: 'ORIGINAL',
    });
    expect(result.every((tag) => Object.keys(tag).sort().join(',') === 'id,name,tagCode')).toBe(true);
    expect(creatorWorkTag.createMany).toHaveBeenCalledTimes(2);
    expect(creatorWorkTag.createMany).toHaveBeenLastCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });
});
