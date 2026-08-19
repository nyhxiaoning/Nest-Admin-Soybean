import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** PC Creator Center 验证码响应。 */
export class CreatorCodeResponseDto {
  @ApiPropertyOptional({ description: '仅开发和测试环境返回' })
  code?: string;
}

/** PC Creator Center 登录响应。 */
export class CreatorLoginResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ type: [String] })
  menuCodes: string[];
}
