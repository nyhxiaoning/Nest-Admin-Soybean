import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CreatorOssStsService } from '../../storage/services/creator-oss-sts.service';
import { BusinessException } from 'src/shared/exceptions';
import { ResponseCode } from 'src/shared/response';
import { CreatorSession } from '../../common';
import { CreatorUploadRole, CreatorUploadTokenRequestDto, CreatorUploadTokenResponseDto } from '../dto';

const ROLE_CONFIG: Record<CreatorUploadRole, { directory: string; maxSize: number; extensions: string[] }> = {
  [CreatorUploadRole.COVER_IMAGE]: {
    directory: 'cover',
    maxSize: 10 * 1024 * 1024,
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
  },
  [CreatorUploadRole.GIF_FILE]: { directory: 'gif', maxSize: 50 * 1024 * 1024, extensions: ['gif'] },
  [CreatorUploadRole.EDITABLE_JSON]: { directory: 'editable', maxSize: 20 * 1024 * 1024, extensions: ['json'] },
  [CreatorUploadRole.STATIC_BIN]: { directory: 'bin', maxSize: 20 * 1024 * 1024, extensions: ['bin', 'png', 'json'] },
};

@Injectable()
export class CreatorWorkUploadService {
  constructor(private readonly stsService: CreatorOssStsService) {}

  async createUploadCredential(
    session: CreatorSession,
    dto: CreatorUploadTokenRequestDto,
  ): Promise<CreatorUploadTokenResponseDto> {
    const role = ROLE_CONFIG[dto.role];
    this.validateFile(dto, role);
    const now = new Date();
    const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
      now.getUTCDate(),
    ).padStart(2, '0')}`;
    const objectPrefix = `creator/${session.id}/${role.directory}/${date}/${randomUUID()}`;
    const credential = await this.stsService.assumeUploadRole({ creatorId: session.id, objectPrefix });
    const baseUrl = credential.publicBaseUrl?.replace(/\/$/, '') ?? '';
    return {
      endpoint: credential.endpoint,
      region: credential.region,
      bucketName: credential.bucketName,
      accessKeyId: credential.accessKeyId,
      accessKeySecret: credential.accessKeySecret,
      expiration: credential.expiration,
      token: credential.token,
      requestId: credential.requestId,
      path: objectPrefix,
      fullPath: `${baseUrl}/${objectPrefix}`,
    };
  }

  private validateFile(dto: CreatorUploadTokenRequestDto, config: { maxSize: number; extensions: string[] }): void {
    BusinessException.throwIf(
      dto.fileSize !== undefined && dto.fileSize > config.maxSize,
      '上传文件大小超过限制',
      ResponseCode.FILE_SIZE_EXCEEDED,
    );
    if (!dto.fileName) return;
    BusinessException.throwIf(/[\\/\u0000-\u001f]/.test(dto.fileName), '文件名不合法', ResponseCode.PARAM_INVALID);
    const extension = dto.fileName.includes('.') ? dto.fileName.split('.').pop()!.toLowerCase() : '';
    BusinessException.throwIf(
      !config.extensions.includes(extension),
      '文件类型不允许',
      ResponseCode.FILE_TYPE_NOT_ALLOWED,
    );
  }
}
