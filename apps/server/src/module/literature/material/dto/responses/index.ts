import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from 'src/shared/dto/base.response.dto';

/**
 * 素材响应 DTO
 */
export class MaterialResponseDto extends BaseResponseDto {
  @Expose()
  @ApiProperty({ description: '素材 ID' })
  materialId!: number;

  @Expose()
  @ApiProperty({ description: '素材类型', enum: ['0', '1', '2'] })
  type!: string;

  @Expose()
  @ApiProperty({ description: '素材内容' })
  content!: string;

  @Expose()
  @ApiProperty({ description: '出处' })
  source?: string;
}
