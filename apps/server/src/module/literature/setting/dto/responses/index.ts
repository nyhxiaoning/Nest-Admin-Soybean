import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from 'src/shared/dto/base.response.dto';

/**
 * 编辑室设置响应 DTO
 */
export class SettingResponseDto extends BaseResponseDto {
  @Expose()
  @ApiProperty({ description: '设置 ID' })
  settingId!: number;

  @Expose()
  @ApiProperty({ description: '字体大小（px）' })
  fontSize!: number;

  @Expose()
  @ApiProperty({ description: '字体族' })
  fontFamily!: string;

  @Expose()
  @ApiProperty({ description: '自动保存开关（0关 1开）' })
  autosave!: string;

  @Expose()
  @ApiProperty({ description: '自动保存间隔（秒）' })
  autosaveInterval!: number;

  @Expose()
  @ApiProperty({ description: '默认导出格式（md/pdf）' })
  exportFormat!: string;
}
