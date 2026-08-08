import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from 'src/shared/dto/base.response.dto';

/**
 * 标签响应 DTO（含使用次数）
 */
export class TagResponseDto extends BaseResponseDto {
  @Expose()
  @ApiProperty({ description: '标签 ID' })
  tagId!: number;

  @Expose()
  @ApiProperty({ description: '标签名称' })
  tagName!: string;

  @Expose()
  @ApiProperty({ description: '颜色（hex）' })
  color!: string;

  @Expose()
  @ApiProperty({ description: '关联文稿数' })
  manuscriptCount!: number;
}
