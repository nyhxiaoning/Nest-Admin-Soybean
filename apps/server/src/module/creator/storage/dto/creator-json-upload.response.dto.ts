import { ApiProperty } from '@nestjs/swagger';

export class CreatorJsonUploadResponseDto {
  @ApiProperty({ format: 'uuid' })
  fileId: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ example: 'application/json' })
  contentType: 'application/json';

  @ApiProperty({ description: '序列化后的 UTF-8 字节数' })
  size: number;

  @ApiProperty({ description: '暂存过期时间，Unix 毫秒时间戳' })
  expiresAt: number;
}
