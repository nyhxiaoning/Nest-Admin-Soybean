import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotRequireAuth } from 'src/module/system/user/user.decorator';
import { Result } from 'src/shared/response';
import { IgnoreTenant } from 'src/tenant';
import { CreatorJwtGuard } from '../../common';
import { CreatorWorkReleaseService } from '../services/creator-work-release.service';

@ApiTags('PC Creator Center - 作品标签')
@ApiBearerAuth('Authorization')
@Controller('creator/work-tags')
@NotRequireAuth()
@IgnoreTenant()
@UseGuards(CreatorJwtGuard)
export class CreatorWorkTagsController {
  constructor(private readonly releaseService: CreatorWorkReleaseService) {}

  @Get()
  async list() {
    return Result.ok(await this.releaseService.listTags());
  }
}
