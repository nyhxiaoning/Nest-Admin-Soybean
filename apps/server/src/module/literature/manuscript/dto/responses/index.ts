import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from 'src/shared/dto/base.response.dto';

/**
 * 文稿响应 DTO
 */
export class ManuscriptResponseDto extends BaseResponseDto {
  @Expose()
  @ApiProperty({ description: '文稿 ID' })
  manuscriptId!: number;

  @Expose()
  @ApiProperty({ description: '标题' })
  title!: string;

  @Expose()
  @ApiProperty({ description: '字数' })
  wordCount!: number;

  @Expose()
  @ApiProperty({ description: '状态（0=草稿 1=正式 2=归档 3=回收站）' })
  status!: string;

  @Expose()
  @ApiProperty({ description: '标签列表' })
  tags!: Array<{ tagId: number; tagName: string; color: string }>;
}

/**
 * 文稿详情响应 DTO（包含内容）
 */
export class ManuscriptDetailResponseDto extends BaseResponseDto {
  @Expose()
  @ApiProperty({ description: '文稿 ID' })
  manuscriptId!: number;

  @Expose()
  @ApiProperty({ description: '标题' })
  title!: string;

  @Expose()
  @ApiProperty({ description: 'Markdown 内容' })
  content!: string;

  @Expose()
  @ApiProperty({ description: '字数' })
  wordCount!: number;

  @Expose()
  @ApiProperty({ description: '状态' })
  status!: string;

  @Expose()
  @ApiProperty({ description: '标签列表' })
  tags!: Array<{ tagId: number; tagName: string; color: string }>;
}

/**
 * 工作台概览响应 DTO
 */
export class WorkbenchOverviewResponseDto {
  @ApiProperty({ description: '草稿箱数量' })
  totalDrafts!: number;

  @ApiProperty({ description: '正式稿件数量' })
  totalPublished!: number;

  @ApiProperty({ description: '归档稿件数量' })
  totalArchived!: number;

  @ApiProperty({ description: '总字数' })
  totalWords!: number;

  @ApiProperty({ description: '总素材数' })
  totalMaterials!: number;

  @ApiProperty({ description: '总标签数' })
  totalTags!: number;

  @ApiProperty({ description: '最近文稿列表', type: [ManuscriptResponseDto] })
  recent!: ManuscriptResponseDto[];
}
