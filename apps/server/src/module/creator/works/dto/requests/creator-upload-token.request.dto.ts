import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum CreatorUploadRole {
  COVER_IMAGE = 'COVER_IMAGE',
  GIF_FILE = 'GIF_FILE',
  EDITABLE_JSON = 'EDITABLE_JSON',
  STATIC_BIN = 'STATIC_BIN',
}

export class CreatorUploadTokenRequestDto {
  @ApiProperty({ enum: CreatorUploadRole })
  @IsEnum(CreatorUploadRole)
  role: CreatorUploadRole;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50 * 1024 * 1024)
  fileSize?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;
}
