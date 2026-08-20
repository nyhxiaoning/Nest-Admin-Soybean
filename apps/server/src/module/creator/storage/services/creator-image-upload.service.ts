import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions';
import { ResponseCode } from 'src/shared/response';
import { CreatorSession } from '../../common';
import { CreatorImageUploadResponseDto } from '../dto/creator-image-upload.response.dto';
import { CreatorImageStorage } from '../interfaces/creator-image-storage.interface';

export const CREATOR_IMAGE_MAX_SIZE = 10 * 1024 * 1024;

@Injectable()
export class CreatorImageUploadService {
  constructor(private readonly storage: CreatorImageStorage) {}

  upload(session: CreatorSession, file?: Express.Multer.File): Promise<CreatorImageUploadResponseDto> {
    BusinessException.throwIfNull(file, '请选择要上传的图片', ResponseCode.PARAM_INVALID);
    BusinessException.throwIf(
      file.size === 0 || file.buffer.length === 0,
      '图片内容不能为空',
      ResponseCode.PARAM_INVALID,
    );
    BusinessException.throwIf(
      !file.mimetype.toLowerCase().startsWith('image/'),
      '只允许上传图片文件',
      ResponseCode.FILE_TYPE_NOT_ALLOWED,
    );
    BusinessException.throwIf(
      file.size > CREATOR_IMAGE_MAX_SIZE,
      '图片大小不能超过 10 MiB',
      ResponseCode.FILE_SIZE_EXCEEDED,
    );

    return this.storage.store(session.id, file);
  }
}
