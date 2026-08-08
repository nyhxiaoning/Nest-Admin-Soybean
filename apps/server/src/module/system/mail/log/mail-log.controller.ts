import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MailLogService } from './mail-log.service';
import { ListMailLogDto } from './dto/index';
import { RequirePermission } from 'src/core/decorators/require-permission.decorator';
import { Api } from 'src/core/decorators/api.decorator';
import { MailLogResponseDto } from './dto';

@ApiTags('邮件日志')
@Controller('system/mail/log')
@ApiBearerAuth('Authorization')
export class MailLogController {
  constructor(private readonly mailLogService: MailLogService) {}

  @Api({
    summary: '邮件日志-列表',
    description: '分页查询邮件日志列表',
    type: MailLogResponseDto,
  })
  @RequirePermission('system:mail:log:list')
  @Get('/list')
  findAll(@Query() query: ListMailLogDto) {
    return this.mailLogService.findAll(query);
  }

  @Api({
    summary: '邮件日志-统计',
    description: '获取邮件发送状态统计',
  })
  @RequirePermission('system:mail:log:list')
  @Get('/stats')
  getStats() {
    return this.mailLogService.getStats();
  }

  @Api({
    summary: '邮件日志-详情',
    description: '根据ID获取邮件日志详情',
    type: MailLogResponseDto,
    params: [{ name: 'id', description: '日志ID' }],
  })
  @RequirePermission('system:mail:log:query')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mailLogService.findOne(id);
  }
}
