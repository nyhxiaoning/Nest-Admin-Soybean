import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkbenchService } from './workbench.service';
import { WorkbenchOverviewResponseDto } from '../manuscript/dto/responses';
import { Api } from 'src/core/decorators/api.decorator';
import { User } from 'src/module/system/user/user.decorator';
import { UserType } from 'src/module/system/user/dto/user';

@ApiTags('文学编辑室-文稿工作台')
@Controller('literature/workbench')
@ApiBearerAuth('Authorization')
export class WorkbenchController {
  constructor(private readonly workbenchService: WorkbenchService) {}

  @Api({
    summary: '工作台-概览',
    description: '统计各状态文稿数量、总字数、素材/标签数及最近 10 篇文稿',
    type: WorkbenchOverviewResponseDto,
  })
  @Get('/overview')
  overview(@User() user: UserType) {
    return this.workbenchService.overview(user.userId);
  }
}
