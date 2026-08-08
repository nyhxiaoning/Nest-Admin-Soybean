import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from 'src/shared/dto/index';
import { Type } from 'class-transformer';

export class ListSmsLogRequestDto extends PageQueryDto {
  @ApiPropertyOptional({ description: '手机号码' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: '渠道ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  channelId?: number;

  @ApiPropertyOptional({ description: '模板ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  templateId?: number;

  @ApiPropertyOptional({ description: '发送状态' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sendStatus?: number;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @IsDateString()
  beginTime?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @IsDateString()
  endTime?: string;
}
