import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SmsLogService } from './sms-log.service';
import { ListSmsLogDto } from './dto';
import { RequirePermission } from 'src/core/decorators/require-permission.decorator';
import { Api } from 'src/core/decorators/api.decorator';
import { SmsLogResponseDto } from './dto';

@ApiTags('短信日志')
@Controller('system/sms/log')
@ApiBearerAuth('Authorization')
export class SmsLogController {
  constructor(private readonly smsLogService: SmsLogService) {}

  @Api({
    summary: '短信日志-列表',
    description: '分页查询短信日志列表',
    type: SmsLogResponseDto,
  })
  @RequirePermission('system:sms:log:list')
  @Get('/list')
  findAll(@Query() query: ListSmsLogDto) {
    return this.smsLogService.findAll(query);
  }

  @Api({
    summary: '短信日志-详情',
    description: '根据ID获取短信日志详情',
    type: SmsLogResponseDto,
    params: [{ name: 'id', description: '日志ID', type: 'number' }],
  })
  @RequirePermission('system:sms:log:query')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.smsLogService.findOne(BigInt(id));
  }

  @Api({
    summary: '短信日志-按手机号查询',
    description: '根据手机号查询短信日志',
    params: [{ name: 'mobile', description: '手机号码', type: 'string' }],
  })
  @RequirePermission('system:sms:log:query')
  @Get('/mobile/:mobile')
  findByMobile(@Param('mobile') mobile: string) {
    return this.smsLogService.findByMobile(mobile);
  }
}
