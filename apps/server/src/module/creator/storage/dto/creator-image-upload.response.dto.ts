import { ApiProperty } from '@nestjs/swagger';

export class CreatorImageUploadResponseDto {
  @ApiProperty({ format: 'uuid' })
  fileId: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty({ example: 'image/png' })
  contentType: string;

  @ApiProperty({ description: '文件大小，单位为字节' })
  size: number;

  @ApiProperty({ description: '暂存过期时间，Unix 毫秒时间戳' })
  expiresAt: number;
}
