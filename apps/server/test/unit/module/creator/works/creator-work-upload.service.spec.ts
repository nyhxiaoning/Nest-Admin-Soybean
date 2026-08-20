import { CreatorWorkUploadService } from 'src/module/creator/works/services/creator-work-upload.service';

describe('CreatorWorkUploadService', () => {
  const stsService = {
    assumeUploadRole: jest.fn(),
  };
  const service = new CreatorWorkUploadService(stsService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues credentials restricted to the authenticated creator and requested file role', async () => {
    stsService.assumeUploadRole.mockResolvedValue({
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      region: 'oss-cn-hangzhou',
      bucketName: 'creator-bucket',
      accessKeyId: 'temporary-id',
      accessKeySecret: 'temporary-secret',
      expiration: '2026-08-20T01:00:00.000Z',
      token: 'temporary-token',
      requestId: 'request-id',
    });

    const result = await service.createUploadCredential(
      { id: 'creator-id' } as never,
      { role: 'COVER_IMAGE', fileName: 'cover.png', fileSize: 1024, fileType: 'image/png' } as never,
    );

    expect(stsService.assumeUploadRole).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: 'creator-id',
        objectPrefix: expect.stringMatching(/^creator\/creator-id\/cover\/\d{8}\/[0-9a-f-]+$/),
      }),
    );
    expect(result.path).toMatch(/^creator\/creator-id\/cover\/\d{8}\/[0-9a-f-]+$/);
    expect(result.fullPath).toContain(result.path);
  });
});
