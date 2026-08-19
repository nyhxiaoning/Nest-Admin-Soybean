import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, Matches } from 'class-validator';
import { CreatorAccountType } from '../../common';

/** PC Creator Center 手机验证码请求。 */
export class SendCreatorCodeRequestDto {
  @ApiProperty({ enum: CreatorAccountType, example: CreatorAccountType.PHONE })
  @IsEnum(CreatorAccountType, { message: '当前仅支持手机号登录' })
  accountType: CreatorAccountType;

  @ApiProperty({ example: '13800138000' })
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号' })
  phone: string;
}
