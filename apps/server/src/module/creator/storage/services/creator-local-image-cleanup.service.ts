import { readdir, rmdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfigService } from 'src/config/app-config.service';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class CreatorLocalImageCleanupService {
  private readonly logger = new Logger(CreatorLocalImageCleanupService.name);

  constructor(private readonly config: AppConfigService) {}

  @Cron('0 0 3 * * *')
  async scheduledCleanup(): Promise<void> {
    const deleted = await this.cleanupExpiredFiles();
    if (deleted > 0) this.logger.log(`已清理 ${deleted} 个过期 Creator 暂存文件`);
  }

  async cleanupExpiredFiles(now = new Date()): Promise<number> {
    const uploadRoot = resolve(process.cwd(), this.config.app.file.location);
    const creatorRoot = resolve(uploadRoot, 'creator');
    const cutoff = now.getTime() - this.config.creatorStorage.localImageTtlDays * MILLISECONDS_PER_DAY;

    try {
      return await this.cleanupDirectory(creatorRoot, cutoff, false);
    } catch (error) {
      if (this.isFileSystemError(error, 'ENOENT')) return 0;
      throw error;
    }
  }

  private async cleanupDirectory(directory: string, cutoff: number, removeSelf = true): Promise<number> {
    const entries = await readdir(directory, { withFileTypes: true });
    let deleted = 0;

    for (const entry of entries) {
      const target = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        deleted += await this.cleanupDirectory(target, cutoff);
        continue;
      }
      if (!entry.isFile()) continue;
      const metadata = await stat(target);
      if (metadata.mtimeMs < cutoff) {
        await unlink(target);
        deleted += 1;
      }
    }

    if (removeSelf) {
      try {
        await rmdir(directory);
      } catch (error) {
        if (!this.isFileSystemError(error, 'ENOTEMPTY') && !this.isFileSystemError(error, 'ENOENT')) throw error;
      }
    }
    return deleted;
  }

  private isFileSystemError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code
    );
  }
}
