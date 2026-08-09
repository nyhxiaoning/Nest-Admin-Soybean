import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from 'src/shared/dto';

const MATERIAL_TYPES = ['0', '1', '2'];

/** 创建素材请求 */
export class CreateMaterialRequestDto {
  @ApiProperty({ description: '素材类型', required: true, enum: ['0', '1', '2'] })
  @IsString()
  @IsIn(MATERIAL_TYPES)
  type!: string;

  @ApiProperty({ description: '素材内容', required: true })
  @IsString()
  content!: string;

  @ApiProperty({ description: '出处', required: false })
  @IsOptional()
  @IsString()
  source?: string;
}

/** 更新素材请求 */
export class UpdateMaterialRequestDto {
  @ApiProperty({ description: '素材 ID', required: true })
  @IsInt()
  materialId!: number;

  @ApiProperty({ description: '素材类型', required: false, enum: ['0', '1', '2'] })
  @IsOptional()
  @IsString()
  @IsIn(MATERIAL_TYPES)
  type?: string;

  @ApiProperty({ description: '素材内容', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '出处', required: false })
  @IsOptional()
  @IsString()
  source?: string;
}

/** 素材列表查询请求 */
export class ListMaterialRequestDto extends PageQueryDto {
  @ApiProperty({ description: '素材类型筛选', required: false, enum: ['0', '1', '2'] })
  @IsOptional()
  @IsString()
  @IsIn(MATERIAL_TYPES)
  @Transform(({ value }) => (value === '' ? undefined : value))
  type?: string;

  @ApiProperty({ description: '内容关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}
