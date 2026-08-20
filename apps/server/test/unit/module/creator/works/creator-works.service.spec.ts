import { CreatorWorkPublishStatus, CreatorWorkType } from '@prisma/client';
import { CreatorWorksService } from 'src/module/creator/works/services/creator-works.service';

describe('CreatorWorksService', () => {
  const repository = {
    create: jest.fn(),
    findPage: jest.fn(),
    findOwnedById: jest.fn(),
    touchLastView: jest.fn(),
    updateOwned: jest.fn(),
    softDeleteOwned: jest.fn(),
  };

  const service = new CreatorWorksService(repository as never);

  beforeEach(() => {
    repository.create.mockReset();
    repository.findPage.mockReset();
    repository.findOwnedById.mockReset();
    repository.touchLastView.mockReset();
    repository.updateOwned.mockReset();
    repository.softDeleteOwned.mockReset();
  });

  it('creates a work for the authenticated creator and forces the initial status', async () => {
    repository.create.mockResolvedValue({ id: 'work-id' });

    const result = await service.create({ id: 'creator-id' } as never, {
      id: 'client-supplied-id',
      title: 'First work',
      type: CreatorWorkType.STATIC,
      publishStatus: CreatorWorkPublishStatus.PUBLISHED,
    });

    expect(result).toBe('work-id');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: 'creator-id',
        title: 'First work',
        type: CreatorWorkType.STATIC,
        publishStatus: CreatorWorkPublishStatus.OFFLINE,
      }),
    );
    expect(repository.create.mock.calls[0][0]).not.toHaveProperty('id');
  });

  it('returns only the authenticated creator page with the frontend pagination shape', async () => {
    repository.findPage.mockResolvedValue({
      list: [
        {
          id: 'work-id',
          creatorId: 'creator-id',
          title: 'First work',
          type: CreatorWorkType.STATIC,
          publishStatus: CreatorWorkPublishStatus.OFFLINE,
          workVersion: 1,
          contentConsistent: true,
          createdAt: new Date('2026-08-20T00:00:00.000Z'),
          updatedAt: new Date('2026-08-20T01:00:00.000Z'),
        },
      ],
      total: 1,
    });

    const result = await service.page(
      { id: 'creator-id' } as never,
      { pageNumber: 1, pageSize: 20, keyword: 'First', sortBy: 'CREATED_AT', direction: 'DESC' } as never,
    );

    expect(repository.findPage).toHaveBeenCalledWith(
      'creator-id',
      expect.objectContaining({ pageNumber: 1, pageSize: 20, keyword: 'First' }),
    );
    expect(result).toMatchObject({
      total: 1,
      pageNumber: 1,
      nextPage: false,
      list: [{ id: 'work-id', creatorId: 'creator-id', createTime: 1787184000000 }],
    });
  });

  it('returns an owned detail and records its last view time', async () => {
    repository.findOwnedById.mockResolvedValue({
      id: 'work-id',
      creatorId: 'creator-id',
      title: 'Owned work',
      type: CreatorWorkType.STATIC,
      publishStatus: CreatorWorkPublishStatus.OFFLINE,
      workVersion: 1,
      contentConsistent: true,
      createdAt: new Date('2026-08-20T00:00:00.000Z'),
      updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });
    repository.touchLastView.mockResolvedValue(undefined);

    const result = await service.detail({ id: 'creator-id' } as never, 'work-id');

    expect(repository.findOwnedById).toHaveBeenCalledWith('creator-id', 'work-id');
    expect(repository.touchLastView).toHaveBeenCalledWith('creator-id', 'work-id', expect.any(Date));
    expect(result).toMatchObject({ id: 'work-id', creatorId: 'creator-id', title: 'Owned work' });
  });

  it('updates only an owned work and never accepts publication fields from the client', async () => {
    repository.findOwnedById.mockResolvedValue({
      id: 'work-id',
      creatorId: 'creator-id',
      publishStatus: CreatorWorkPublishStatus.OFFLINE,
      publishedSnapshot: null,
    });
    repository.updateOwned.mockResolvedValue(true);

    await service.update({ id: 'creator-id' } as never, 'work-id', {
      title: 'Updated',
      publishStatus: CreatorWorkPublishStatus.PUBLISHED,
    } as never);

    expect(repository.updateOwned).toHaveBeenCalledWith(
      'creator-id',
      'work-id',
      expect.objectContaining({ title: 'Updated' }),
    );
    expect(repository.updateOwned.mock.calls[0][2]).not.toHaveProperty('publishStatus');
  });

  it('soft-deletes an offline owned work', async () => {
    repository.findOwnedById.mockResolvedValue({
      id: 'work-id',
      creatorId: 'creator-id',
      publishStatus: CreatorWorkPublishStatus.OFFLINE,
    });
    repository.softDeleteOwned.mockResolvedValue(true);

    await service.remove({ id: 'creator-id' } as never, 'work-id');

    expect(repository.softDeleteOwned).toHaveBeenCalledWith('creator-id', 'work-id', expect.any(Date));
  });
});
