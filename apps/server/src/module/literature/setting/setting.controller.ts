import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingService } from './setting.service';
import { UpdateSettingRequestDto } from './dto/requests';
import { SettingResponseDto } from './dto/responses';
import { Api } from 'src/core/decorators/api.decorator';
import { User } from 'src/module/system/user/user.decorator';
import { UserType } from 'src/module/system/user/dto/user';

@ApiTags('文学编辑室-编辑室设置')
@Controller('literature/setting')
@ApiBearerAuth('Authorization')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Api({
    summary: '设置-获取',
    description: '获取当前用户的编辑室设置（首次自动创建默认值）',
    type: SettingResponseDto,
  })
  @Get()
  get(@User() user: UserType) {
    return this.settingService.get(user.userId);
  }

  @Api({
    summary: '设置-更新',
    description: '更新编辑室设置',
    body: UpdateSettingRequestDto,
    type: SettingResponseDto,
  })
  @Put()
  update(@Body() updateDto: UpdateSettingRequestDto, @User() user: UserType) {
    return this.settingService.update(updateDto, user.userId);
  }
}
