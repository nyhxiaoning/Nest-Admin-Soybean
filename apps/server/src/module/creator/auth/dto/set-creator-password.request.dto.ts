import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** PC Creator Center 设置或修改密码请求。 */
export class SetCreatorPasswordRequestDto {
  @ApiPropertyOptional({ description: '已有密码时必填' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ minLength: 8, maxLength: 64 })
  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @MaxLength(64, { message: '密码长度不能超过64位' })
  newPassword: string;
}
