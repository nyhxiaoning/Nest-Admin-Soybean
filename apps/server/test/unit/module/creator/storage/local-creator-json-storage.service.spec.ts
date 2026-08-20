import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalCreatorJsonStorage } from 'src/module/creator/storage/services/local-creator-json-storage.service';
import { ResponseCode } from 'src/shared/response';

describe('LocalCreatorJsonStorage', () => {
  let uploadRoot: string;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), 'creator-json-storage-'));
  });

  afterEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it('stores JSON in the authenticated Creator directory with stable metadata', async () => {
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
    const service = new LocalCreatorJsonStorage(config as never);
    const now = new Date('2026-08-20T06:00:00.000Z');
    const content = { version: 1, layers: [{ id: 'layer-1', visible: true }] };

    const result = await service.store('creator-id', content, now);

    expect(result.fileId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.url).toMatch(
      new RegExp(`^http://localhost:8080/profile/creator/creator-id/json/2026/08/20/${result.fileId}\\.json$`),
    );
    const serialized = JSON.stringify(content);
    expect(result).toMatchObject({
      contentType: 'application/json',
      size: Buffer.byteLength(serialized),
      expiresAt: new Date('2026-08-27T06:00:00.000Z').getTime(),
    });
    const relativePath = new URL(result.url).pathname.replace('/profile/', '');
    await expect(readFile(join(uploadRoot, relativePath), 'utf8')).resolves.toBe(serialized);
  });

  it('rejects serialized JSON larger than 20 MiB', async () => {
    const service = new LocalCreatorJsonStorage({
      app: { file: { location: uploadRoot, domain: 'http://localhost:8080', serveRoot: '/profile' } },
      creatorStorage: { localImageTtlDays: 7 },
    } as never);

    await expect(service.store('creator-id', { payload: 'a'.repeat(20 * 1024 * 1024) })).rejects.toMatchObject({
      errorCode: ResponseCode.FILE_SIZE_EXCEEDED,
    });
  });
});
