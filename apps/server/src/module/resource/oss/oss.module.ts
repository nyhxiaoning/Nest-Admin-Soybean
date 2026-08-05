import { Module } from '@nestjs/common';
import { OssController } from './oss.controller';
import { OssService } from './oss.service';
import { OssRepository } from './oss.repository';

/**
 * OSS 对象存储模块
 * UploadService 和 VersionService 已由全局 UploadModule (@Global) 提供，
 * 无需在此重复 imports。
 */
@Module({
  controllers: [OssController],
  providers: [OssService, OssRepository],
  exports: [OssService],
})
export class OssModule {}
