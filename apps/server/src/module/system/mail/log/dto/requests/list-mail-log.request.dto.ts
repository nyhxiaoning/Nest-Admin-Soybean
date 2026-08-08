import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from 'src/shared/dto/index';
import { Transform } from 'class-transformer';

export class ListMailLogRequestDto extends PageQueryDto {
  @ApiPropertyOptional({ description: '收件人邮箱' })
  @IsOptional()
  @IsString()
  toMail?: string;

  @ApiPropertyOptional({ description: '模板编码' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ description: '发送账号ID' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  accountId?: number;

  @ApiPropertyOptional({ description: '发送状态（0-发送中 1-成功 2-失败）' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== undefined && value !== '' ? Number(value) : undefined))
  sendStatus?: number;
}
