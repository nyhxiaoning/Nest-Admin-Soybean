import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Api } from 'src/core/decorators/api.decorator';
import { ApiThrottle } from 'src/core/decorators/throttle.decorator';
import { NotRequireAuth } from 'src/module/system/user/user.decorator';
import { Result } from 'src/shared/response';
import { IgnoreTenant } from 'src/tenant';
import { CreatorJwtGuard, CreatorSession, CreatorUser } from '../../common';
import { CreatorJsonUploadResponseDto } from '../dto/creator-json-upload.response.dto';
import { CreatorJsonStorage } from '../interfaces/creator-json-storage.interface';

@ApiTags('PC Creator Center - 暂存上传')
@ApiBearerAuth('Authorization')
@Controller('creator/uploads')
@NotRequireAuth()
@IgnoreTenant()
@UseGuards(CreatorJwtGuard)
export class CreatorJsonUploadsController {
  constructor(private readonly jsonStorage: CreatorJsonStorage) {}

  @Post('json')
  @HttpCode(200)
  @Api({
    summary: '将 JSON 内容暂存为可访问 URL',
    description: '保存前端下发的原始 JSON，最大 20 MiB，默认暂存 7 天。',
    type: CreatorJsonUploadResponseDto,
    consumes: ['application/json'],
    responseExample: {
      fileId: 'd239f441-5eb8-4b91-9bf8-bc1c4f67c270',
      url: 'http://localhost:8080/profile/creator/{creatorId}/json/2026/08/20/{fileId}.json',
      contentType: 'application/json',
      size: 48,
      expiresAt: 1787810400000,
    },
    responses: {
      401: { description: 'Creator 未登录或登录已过期' },
      413: { description: 'JSON 请求体或序列化内容超过 20 MiB' },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      example: { version: 1, layers: [{ id: 'layer-1', visible: true }] },
    },
  })
  @ApiThrottle({ ttl: 60_000, limit: 30 })
  async store(
    @CreatorUser() session: CreatorSession,
    @Body() content: unknown,
  ): Promise<Result<CreatorJsonUploadResponseDto>> {
    return Result.ok(await this.jsonStorage.store(session.id, content), 'JSON 内容已暂存');
  }
}
