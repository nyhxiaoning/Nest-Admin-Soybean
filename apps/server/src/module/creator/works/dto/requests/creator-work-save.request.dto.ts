import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorWorkPublishStatus, CreatorWorkType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatorWorkSaveRequestDto {
  @ApiPropertyOptional({ description: '兼容前端字段，服务端创建和更新时均忽略' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @Matches(/\S/, { message: '作品标题不能全为空白字符' })
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ enum: CreatorWorkType })
  @IsOptional()
  @IsEnum(CreatorWorkType)
  type?: CreatorWorkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  gifFileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  gifFileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  editableFileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  binFileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  binFileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4096)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4096)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  frameCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60_000)
  frameDelay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preview?: string;

  @ApiPropertyOptional({ enum: CreatorWorkPublishStatus, description: '兼容前端字段，服务端忽略' })
  @IsOptional()
  @IsEnum(CreatorWorkPublishStatus)
  publishStatus?: CreatorWorkPublishStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
