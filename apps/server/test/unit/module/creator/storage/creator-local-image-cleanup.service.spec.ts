import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CreatorLocalImageCleanupService } from 'src/module/creator/storage/services/creator-local-image-cleanup.service';

describe('CreatorLocalImageCleanupService', () => {
  let uploadRoot: string;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), 'creator-image-cleanup-'));
  });

  afterEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it('deletes only expired files inside the Creator temporary root', async () => {
    const creatorDir = join(uploadRoot, 'creator', 'creator-id', 'images', '2026', '08', '01');
    const otherDir = join(uploadRoot, 'other');
    await mkdir(creatorDir, { recursive: true });
    await mkdir(otherDir, { recursive: true });
    const expiredFile = join(creatorDir, 'expired.png');
    const currentFile = join(creatorDir, 'current.png');
    const otherFile = join(otherDir, 'expired.png');
    await Promise.all([
      writeFile(expiredFile, 'expired'),
      writeFile(currentFile, 'current'),
      writeFile(otherFile, 'other'),
    ]);
    const expiredAt = new Date('2026-08-01T00:00:00.000Z');
    await Promise.all([utimes(expiredFile, expiredAt, expiredAt), utimes(otherFile, expiredAt, expiredAt)]);
    const config = {
      app: { file: { location: uploadRoot } },
      creatorStorage: { localImageTtlDays: 7 },
    };
    const service = new CreatorLocalImageCleanupService(config as never);

    await expect(service.cleanupExpiredFiles(new Date('2026-08-20T00:00:00.000Z'))).resolves.toBe(1);
    await expect(readFile(expiredFile)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(currentFile, 'utf8')).resolves.toBe('current');
    await expect(readFile(otherFile, 'utf8')).resolves.toBe('other');
  });
});
