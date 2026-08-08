import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from 'src/shared/dto';

/** 创建标签请求 */
export class CreateTagRequestDto {
  @ApiProperty({ description: '标签名称', required: true })
  @IsString()
  tagName!: string;

  @ApiProperty({ description: '颜色（hex）', required: false, default: '#2080f0' })
  @IsOptional()
  @IsString()
  color?: string;
}

/** 更新标签请求 */
export class UpdateTagRequestDto {
  @ApiProperty({ description: '标签 ID', required: true })
  @IsInt()
  tagId!: number;

  @ApiProperty({ description: '标签名称', required: false })
  @IsOptional()
  @IsString()
  tagName?: string;

  @ApiProperty({ description: '颜色（hex）', required: false })
  @IsOptional()
  @IsString()
  color?: string;
}

/** 标签列表查询请求 */
export class ListTagRequestDto extends PageQueryDto {
  @ApiProperty({ description: '名称关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}
