import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { CreatorAccountType, CreatorLoginType } from '../../common';

/** PC Creator Center 登录请求。 */
export class CreatorLoginRequestDto {
  @ApiProperty({ enum: CreatorAccountType, example: CreatorAccountType.PHONE })
  @IsEnum(CreatorAccountType, { message: '当前仅支持手机号登录' })
  accountType: CreatorAccountType;

  @ApiProperty({ enum: CreatorLoginType })
  @IsEnum(CreatorLoginType, { message: '不支持的登录类型' })
  loginType: CreatorLoginType;

  @ApiProperty({ example: '13800138000' })
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号' })
  phone: string;

  @ApiPropertyOptional({ example: '1234' })
  @ValidateIf((dto: CreatorLoginRequestDto) => dto.loginType === CreatorLoginType.CODE)
  @Matches(/^\d{4}$/, { message: '验证码必须为四位数字' })
  code?: string;

  @ApiPropertyOptional({ minLength: 8, maxLength: 64 })
  @ValidateIf((dto: CreatorLoginRequestDto) => dto.loginType === CreatorLoginType.PASSWORD)
  @IsString({ message: '请输入密码' })
  @MinLength(8, { message: '密码长度不能少于8位' })
  @MaxLength(64, { message: '密码长度不能超过64位' })
  password?: string;
}
