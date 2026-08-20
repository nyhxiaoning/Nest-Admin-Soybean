import { Controller, HttpCode, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Api } from 'src/core/decorators/api.decorator';
import { NotRequireAuth } from 'src/module/system/user/user.decorator';
import { Result } from 'src/shared/response';
import { IgnoreTenant } from 'src/tenant';
import { CreatorJwtGuard, CreatorSession, CreatorUser } from '../../common';
import { CreatorImageUploadResponseDto } from '../dto/creator-image-upload.response.dto';
import { CREATOR_IMAGE_MAX_SIZE, CreatorImageUploadService } from '../services/creator-image-upload.service';

@ApiTags('PC Creator Center - 暂存上传')
@ApiBearerAuth('Authorization')
@Controller('creator/uploads')
@NotRequireAuth()
@IgnoreTenant()
@UseGuards(CreatorJwtGuard)
export class CreatorImageUploadController {
  constructor(private readonly uploadService: CreatorImageUploadService) {}

  @Post('images')
  @HttpCode(200)
  @Api({
    summary: '暂存 Creator 图片',
    description: '图片暂存 7 天，支持所有 image/* MIME，单文件最大 10 MiB。',
    type: CreatorImageUploadResponseDto,
    fileUpload: { fieldName: 'file', description: 'Creator 图片', allowedTypes: ['image/*'], maxSize: '10 MiB' },
    responseExample: {
      fileId: 'd2b5556b-8718-41ca-bab7-a2978993415e',
      url: 'http://localhost:8080/profile/creator/{creatorId}/images/2026/08/20/{fileId}.png',
      originalName: 'image.png',
      contentType: 'image/png',
      size: 102400,
      expiresAt: 1787810400000,
    },
    responses: {
      401: { description: 'Creator 未登录或登录已过期' },
      413: { description: '图片超过 10 MiB' },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CREATOR_IMAGE_MAX_SIZE } }))
  async uploadImage(
    @CreatorUser() session: CreatorSession,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Result<CreatorImageUploadResponseDto>> {
    return Result.ok(await this.uploadService.upload(session, file), '图片上传成功');
  }
}
