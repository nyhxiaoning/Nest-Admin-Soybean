import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalCreatorImageStorage } from 'src/module/creator/storage/services/local-creator-image-storage.service';

describe('LocalCreatorImageStorage', () => {
  let uploadRoot: string;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), 'creator-image-storage-'));
  });

  afterEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it('stores an image in the authenticated Creator directory with stable metadata', async () => {
    const config = {
      app: {
        file: {
          location: uploadRoot,
          domain: 'http://localhost:8080',
          serveRoot: '/profile',
        },
      },
      creatorStorage: { localImageTtlDays: 7 },
    };
    const service = new LocalCreatorImageStorage(config as never);
    const now = new Date('2026-08-20T06:00:00.000Z');
    const file = {
      originalname: 'avatar.anything',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from([1, 2, 3, 4]),
    } as Express.Multer.File;

    const result = await service.store('creator-id', file, now);

    expect(result.fileId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.url).toMatch(
      new RegExp(`^http://localhost:8080/profile/creator/creator-id/images/2026/08/20/${result.fileId}\\.png$`),
    );
    expect(result).toMatchObject({
      originalName: 'avatar.anything',
      contentType: 'image/png',
      size: 4,
      expiresAt: new Date('2026-08-27T06:00:00.000Z').getTime(),
    });
    const relativePath = new URL(result.url).pathname.replace('/profile/', '');
    await expect(readFile(join(uploadRoot, relativePath))).resolves.toEqual(file.buffer);
  });
});
