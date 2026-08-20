import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CREATOR_WORK_DEFAULT_PAGE_SIZE } from '../../constants/creator-work.constants';

export enum CreatorWorkSortBy {
  CREATED_AT = 'CREATED_AT',
  LAST_VIEW_TIME = 'LAST_VIEW_TIME',
  TITLE = 'TITLE',
}

export enum CreatorWorkSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class CreatorWorkPageRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber = 1;

  @ApiPropertyOptional({ default: CREATOR_WORK_DEFAULT_PAGE_SIZE, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = CREATOR_WORK_DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ enum: CreatorWorkSortBy, default: CreatorWorkSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(CreatorWorkSortBy)
  sortBy = CreatorWorkSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: CreatorWorkSortDirection, default: CreatorWorkSortDirection.DESC })
  @IsOptional()
  @IsEnum(CreatorWorkSortDirection)
  direction = CreatorWorkSortDirection.DESC;

  get skip(): number {
    return (this.pageNumber - 1) * this.pageSize;
  }

  get take(): number {
    return this.pageSize;
  }
}
