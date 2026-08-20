import { CreatorImageStorage } from 'src/module/creator/storage/interfaces/creator-image-storage.interface';
import { CreatorImageUploadService } from 'src/module/creator/storage/services/creator-image-upload.service';
import { BusinessException } from 'src/shared/exceptions';

describe('CreatorImageUploadService', () => {
  const storage = {
    store: jest.fn(),
  };
  const service = new CreatorImageUploadService(storage as unknown as CreatorImageStorage);
  const session = { id: 'creator-id' } as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['missing file', undefined, '请选择要上传的图片'],
    [
      'empty file',
      { originalname: 'empty.png', mimetype: 'image/png', size: 0, buffer: Buffer.alloc(0) },
      '图片内容不能为空',
    ],
    [
      'non-image file',
      { originalname: 'data.json', mimetype: 'application/json', size: 2, buffer: Buffer.from('{}') },
      '只允许上传图片文件',
    ],
    [
      'oversized image',
      {
        originalname: 'large.png',
        mimetype: 'image/png',
        size: 10 * 1024 * 1024 + 1,
        buffer: Buffer.alloc(1),
      },
      '图片大小不能超过 10 MiB',
    ],
  ])('rejects %s', async (_name, file, message) => {
    try {
      await service.upload(session, file as Express.Multer.File | undefined);
      throw new Error('Expected upload to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getResponse()).toMatchObject({ msg: message });
    }
    expect(storage.store).not.toHaveBeenCalled();
  });

  it('stores a valid image for the authenticated Creator', async () => {
    const file = {
      originalname: 'image.avif',
      mimetype: 'image/avif',
      size: 3,
      buffer: Buffer.from([1, 2, 3]),
    } as Express.Multer.File;
    storage.store.mockResolvedValue({ fileId: 'file-id', url: '/profile/file.avif' });

    await expect(service.upload(session, file)).resolves.toMatchObject({ fileId: 'file-id' });
    expect(storage.store).toHaveBeenCalledWith('creator-id', file);
  });
});
