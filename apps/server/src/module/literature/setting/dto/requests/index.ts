import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 更新编辑室设置请求 */
export class UpdateSettingRequestDto {
  @ApiProperty({ description: '字体大小（px）', required: false, default: 16 })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(24)
  fontSize?: number;

  @ApiProperty({ description: '字体族', required: false })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiProperty({ description: '自动保存开关', required: false, enum: ['0', '1'] })
  @IsOptional()
  @IsString()
  @IsIn(['0', '1'])
  autosave?: string;

  @ApiProperty({ description: '自动保存间隔（秒）', required: false, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  autosaveInterval?: number;

  @ApiProperty({ description: '默认导出格式', required: false, enum: ['md', 'pdf'] })
  @IsOptional()
  @IsString()
  @IsIn(['md', 'pdf'])
  exportFormat?: string;
}
