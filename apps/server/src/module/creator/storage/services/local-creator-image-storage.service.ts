import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { extension } from 'mime-types';
import { AppConfigService } from 'src/config/app-config.service';
import { CreatorImageStorage, CreatorStoredImage } from '../interfaces/creator-image-storage.interface';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class LocalCreatorImageStorage extends CreatorImageStorage {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  async store(creatorId: string, file: Express.Multer.File, now = new Date()): Promise<CreatorStoredImage> {
    const fileId = randomUUID();
    const suffix = extension(file.mimetype) || 'img';
    const datePath = [
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ];
    const relativeSegments = ['creator', creatorId, 'images', ...datePath];
    const uploadRoot = resolve(process.cwd(), this.config.app.file.location);
    const targetDir = resolve(uploadRoot, ...relativeSegments);
    const fileName = `${fileId}.${suffix}`;

    await mkdir(targetDir, { recursive: true });
    await writeFile(resolve(targetDir, fileName), file.buffer, { flag: 'wx' });

    const domain = this.config.app.file.domain.replace(/\/$/, '');
    const serveRoot = `/${this.config.app.file.serveRoot.replace(/^\/+|\/+$/g, '')}`;
    const urlPath = [...relativeSegments, fileName].join('/');

    return {
      fileId,
      url: `${domain}${serveRoot}/${urlPath}`,
      originalName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      expiresAt: now.getTime() + this.config.creatorStorage.localImageTtlDays * MILLISECONDS_PER_DAY,
    };
  }
}
