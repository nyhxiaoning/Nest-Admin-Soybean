import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';
import { BusinessException } from 'src/shared/exceptions';
import { ResponseCode } from 'src/shared/response';
import { CreatorJsonStorage, CreatorStoredJson } from '../interfaces/creator-json-storage.interface';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 20 * 1024 * 1024;

@Injectable()
export class LocalCreatorJsonStorage extends CreatorJsonStorage {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  async store(creatorId: string, content: unknown, now = new Date()): Promise<CreatorStoredJson> {
    const fileId = randomUUID();
    const serialized = this.serialize(content);
    const size = Buffer.byteLength(serialized);
    BusinessException.throwIf(size > MAX_JSON_BYTES, 'JSON 内容不能超过 20 MiB', ResponseCode.FILE_SIZE_EXCEEDED);
    const datePath = [
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ];
    const relativeSegments = ['creator', creatorId, 'json', ...datePath];
    const uploadRoot = resolve(process.cwd(), this.config.app.file.location);
    const targetDir = resolve(uploadRoot, ...relativeSegments);
    const fileName = `${fileId}.json`;

    await mkdir(targetDir, { recursive: true });
    await writeFile(resolve(targetDir, fileName), serialized, { encoding: 'utf8', flag: 'wx' });

    const domain = this.config.app.file.domain.replace(/\/$/, '');
    const serveRoot = `/${this.config.app.file.serveRoot.replace(/^\/+|\/+$/g, '')}`;
    const urlPath = [...relativeSegments, fileName].join('/');

    return {
      fileId,
      url: `${domain}${serveRoot}/${urlPath}`,
      contentType: 'application/json',
      size,
      expiresAt: now.getTime() + this.config.creatorStorage.localImageTtlDays * MILLISECONDS_PER_DAY,
    };
  }

  private serialize(content: unknown): string {
    try {
      const serialized = JSON.stringify(content);
      if (serialized === undefined) {
        throw new BusinessException(ResponseCode.PARAM_INVALID, 'JSON 内容无法序列化');
      }
      return serialized;
    } catch (error) {
      if (error instanceof BusinessException) throw error;
      throw new BusinessException(ResponseCode.PARAM_INVALID, 'JSON 内容无法序列化');
    }
  }
}
