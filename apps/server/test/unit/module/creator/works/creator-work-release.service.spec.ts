import {
  CreatorWorkPublishStatus,
  CreatorWorkSubmissionStatus,
  CreatorWorkSubmissionType,
  CreatorWorkType,
} from '@prisma/client';
import { CreatorWorkReleaseService } from 'src/module/creator/works/services/creator-work-release.service';

describe('CreatorWorkReleaseService', () => {
  const workRepository = {
    findOwnedById: jest.fn(),
    countReleaseStats: jest.fn(),
    findReleasePage: jest.fn(),
  };
  const tagRepository = {
    findEnabledByCode: jest.fn(),
  };
  const submissionRepository = {
    findActiveByWork: jest.fn(),
    submit: jest.fn(),
    withdraw: jest.fn(),
  };
  const service = new CreatorWorkReleaseService(
    workRepository as never,
    tagRepository as never,
    submissionRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits an offline owned work with an immutable server-built snapshot', async () => {
    workRepository.findOwnedById.mockResolvedValue({
      id: 'work-id',
      creatorId: 'creator-id',
      title: 'Publish me',
      type: CreatorWorkType.STATIC,
      coverUrl: 'https://oss.example/cover.png',
      gifFileUrl: null,
      gifFileSize: null,
      editableFileUrl: null,
      binFileUrl: null,
      binFileSize: null,
      width: 32,
      height: 16,
      frameCount: 1,
      frameDelay: 120,
      preview: null,
      remark: null,
      publishStatus: CreatorWorkPublishStatus.OFFLINE,
      workVersion: 1,
    });
    tagRepository.findEnabledByCode.mockResolvedValue({ id: 'tag-id' });
    submissionRepository.findActiveByWork.mockResolvedValue(null);
    submissionRepository.submit.mockResolvedValue(undefined);

    await service.submit({ id: 'creator-id' } as never, 'work-id', { tagCode: 'ORIGINAL', remark: 'Please review' });

    expect(submissionRepository.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        workId: 'work-id',
        creatorId: 'creator-id',
        tagId: 'tag-id',
        type: CreatorWorkSubmissionType.PUBLISH,
        status: CreatorWorkSubmissionStatus.REVIEWING,
        nextWorkStatus: CreatorWorkPublishStatus.REVIEWING,
        snapshot: expect.objectContaining({ title: 'Publish me', width: 32, height: 16 }),
      }),
    );
    expect(submissionRepository.submit.mock.calls[0][0].snapshot).not.toHaveProperty('creatorId');
  });

  it('submits an update for a published work without taking the approved version offline', async () => {
    workRepository.findOwnedById.mockResolvedValue({
      id: 'work-id',
      creatorId: 'creator-id',
      title: 'Updated draft',
      type: CreatorWorkType.GIF,
      coverUrl: null,
      gifFileUrl: 'https://oss.example/work.gif',
      gifFileSize: BigInt(1024),
      editableFileUrl: null,
      binFileUrl: null,
      binFileSize: null,
      width: 32,
      height: 16,
      frameCount: 3,
      frameDelay: 120,
      preview: null,
      remark: null,
      publishStatus: CreatorWorkPublishStatus.PUBLISHED,
      workVersion: 2,
    });
    submissionRepository.findActiveByWork.mockResolvedValue(null);
    submissionRepository.submit.mockResolvedValue(undefined);

    await service.submitUpdate({ id: 'creator-id' } as never, 'work-id', {});

    expect(submissionRepository.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CreatorWorkSubmissionType.UPDATE,
        nextWorkStatus: CreatorWorkPublishStatus.PUBLISHED,
        version: 3,
      }),
    );
  });

  it('withdraws the active review and returns a first publication to offline', async () => {
    workRepository.findOwnedById.mockResolvedValue({
      id: 'work-id',
      creatorId: 'creator-id',
      publishStatus: CreatorWorkPublishStatus.REVIEWING,
    });
    submissionRepository.findActiveByWork.mockResolvedValue({
      id: 'submission-id',
      type: CreatorWorkSubmissionType.PUBLISH,
    });
    submissionRepository.withdraw.mockResolvedValue(true);

    await service.withdraw({ id: 'creator-id' } as never, 'work-id');

    expect(submissionRepository.withdraw).toHaveBeenCalledWith({
      creatorId: 'creator-id',
      workId: 'work-id',
      submissionId: 'submission-id',
      nextWorkStatus: CreatorWorkPublishStatus.OFFLINE,
    });
  });

  it('returns creator-scoped release statistics and page data', async () => {
    workRepository.countReleaseStats.mockResolvedValue({
      publishedCount: 2,
      reviewingCount: 1,
      applicableCount: 3,
    });
    workRepository.findReleasePage.mockResolvedValue({ list: [], total: 0 });

    const result = await service.pageReleases({ id: 'creator-id' } as never, { pageNumber: 1, pageSize: 20 } as never);

    expect(workRepository.countReleaseStats).toHaveBeenCalledWith('creator-id');
    expect(result).toEqual({
      publishedCount: 2,
      reviewingCount: 1,
      applicableCount: 3,
      page: { list: [], total: 0, pageNumber: 1, nextPage: false },
    });
  });
});
