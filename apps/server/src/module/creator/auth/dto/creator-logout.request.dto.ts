import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** PC Creator Center 登出请求，token 字段用于兼容现有前端契约。 */
export class CreatorLogoutRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;
}
