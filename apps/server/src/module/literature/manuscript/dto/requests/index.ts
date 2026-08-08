import { IsArray, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from 'src/shared/dto';

/** 创建文稿请求 */
export class CreateManuscriptRequestDto {
  @ApiProperty({ description: '文稿标题', required: true })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Markdown 内容', required: false, default: '' })
  @IsOptional()
  @IsString()
  content?: string;
}

/** 更新文稿请求 */
export class UpdateManuscriptRequestDto {
  @ApiProperty({ description: '文稿 ID', required: true })
  @IsInt()
  manuscriptId!: number;

  @ApiProperty({ description: '文稿标题', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiProperty({ description: 'Markdown 内容', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '字数', required: false })
  @IsOptional()
  @IsInt()
  wordCount?: number;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

/** 自动保存请求 */
export class SaveManuscriptRequestDto {
  @ApiProperty({ description: '文稿 ID', required: true })
  @IsInt()
  manuscriptId!: number;

  @ApiProperty({ description: 'Markdown 内容', required: true })
  @IsString()
  content!: string;

  @ApiProperty({ description: '字数', required: false })
  @IsOptional()
  @IsInt()
  wordCount?: number;
}

/** 修改文稿状态请求 */
export class ChangeStatusRequestDto {
  @ApiProperty({ description: '文稿 ID', required: true })
  @IsInt()
  manuscriptId!: number;

  @ApiProperty({ description: '目标状态', required: true })
  @IsString()
  status!: string;
}

/** 文稿列表查询请求 */
export class ListManuscriptRequestDto extends PageQueryDto {
  @ApiProperty({ description: '状态筛选（0草稿/1正式/2归档/3回收站）', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: '标签 ID', required: false })
  @IsOptional()
  @IsInt()
  tagId?: number;

  @ApiProperty({ description: '标题关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}

/** 绑定标签请求 */
export class BindTagsRequestDto {
  @ApiProperty({ description: '文稿 ID', required: true })
  @IsInt()
  manuscriptId!: number;

  @ApiProperty({ description: '标签 ID 列表', required: true, type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  tagIds!: number[];
}
