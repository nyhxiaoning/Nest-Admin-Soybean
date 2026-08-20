import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiThrottle } from 'src/core/decorators/throttle.decorator';
import { NotRequireAuth } from 'src/module/system/user/user.decorator';
import { Result } from 'src/shared/response';
import { IgnoreTenant } from 'src/tenant';
import { CreatorJwtGuard, CreatorSession, CreatorUser } from '../../common';
import {
  CreatorReleasePageRequestDto,
  CreatorUploadTokenRequestDto,
  CreatorWorkPageRequestDto,
  CreatorWorkSaveRequestDto,
  CreatorWorkSubmitRequestDto,
} from '../dto';
import { CreatorWorkReleaseService } from '../services/creator-work-release.service';
import { CreatorWorkUploadService } from '../services/creator-work-upload.service';
import { CreatorWorksService } from '../services/creator-works.service';

@ApiTags('PC Creator Center - 作品')
@ApiBearerAuth('Authorization')
@Controller('creator/works')
@NotRequireAuth()
@IgnoreTenant()
@UseGuards(CreatorJwtGuard)
export class CreatorWorksController {
  constructor(
    private readonly worksService: CreatorWorksService,
    private readonly releaseService: CreatorWorkReleaseService,
    private readonly uploadService: CreatorWorkUploadService,
  ) {}

  @Get()
  async page(@CreatorUser() session: CreatorSession, @Query() query: CreatorWorkPageRequestDto) {
    return Result.ok(await this.worksService.page(session, query));
  }

  @Post()
  @HttpCode(200)
  async create(@CreatorUser() session: CreatorSession, @Body() dto: CreatorWorkSaveRequestDto) {
    return Result.ok(await this.worksService.create(session, dto), '作品创建成功');
  }

  @Post('upload-token')
  @HttpCode(200)
  @ApiThrottle({ ttl: 60_000, limit: 30 })
  async uploadToken(@CreatorUser() session: CreatorSession, @Body() dto: CreatorUploadTokenRequestDto) {
    return Result.ok(await this.uploadService.createUploadCredential(session, dto));
  }

  @Get('releases')
  async releases(@CreatorUser() session: CreatorSession, @Query() query: CreatorReleasePageRequestDto) {
    return Result.ok(await this.releaseService.pageReleases(session, query));
  }

  @Get('release-candidates')
  async releaseCandidates(@CreatorUser() session: CreatorSession, @Query() query: CreatorReleasePageRequestDto) {
    return Result.ok(await this.releaseService.pageCandidates(session, query));
  }

  @Delete('releases/:id')
  async removeFromReleases(@CreatorUser() session: CreatorSession, @Param('id', ParseUUIDPipe) workId: string) {
    await this.releaseService.removeFromReleases(session, workId);
    return Result.ok(undefined, '已从发布管理移除');
  }

  @Get(':id')
  async detail(@CreatorUser() session: CreatorSession, @Param('id', ParseUUIDPipe) workId: string) {
    return Result.ok(await this.worksService.detail(session, workId));
  }

  @Put(':id')
  async update(
    @CreatorUser() session: CreatorSession,
    @Param('id', ParseUUIDPipe) workId: string,
    @Body() dto: CreatorWorkSaveRequestDto,
  ) {
    await this.worksService.update(session, workId, dto);
    return Result.ok(undefined, '作品更新成功');
  }

  @Delete(':id')
  async remove(@CreatorUser() session: CreatorSession, @Param('id', ParseUUIDPipe) workId: string) {
    await this.worksService.remove(session, workId);
    return Result.ok(undefined, '作品删除成功');
  }

  @Post(':id/submit')
  @HttpCode(200)
  async submit(
    @CreatorUser() session: CreatorSession,
    @Param('id', ParseUUIDPipe) workId: string,
    @Body() dto: CreatorWorkSubmitRequestDto,
  ) {
    await this.releaseService.submit(session, workId, dto);
    return Result.ok(undefined, '作品已提交审核');
  }

  @Post(':id/submit-update')
  @HttpCode(200)
  async submitUpdate(
    @CreatorUser() session: CreatorSession,
    @Param('id', ParseUUIDPipe) workId: string,
    @Body() dto: CreatorWorkSubmitRequestDto,
  ) {
    await this.releaseService.submitUpdate(session, workId, dto);
    return Result.ok(undefined, '作品更新已提交审核');
  }

  @Post(':id/withdraw')
  @HttpCode(200)
  async withdraw(@CreatorUser() session: CreatorSession, @Param('id', ParseUUIDPipe) workId: string) {
    await this.releaseService.withdraw(session, workId);
    return Result.ok(undefined, '审核申请已撤回');
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  async unpublish(@CreatorUser() session: CreatorSession, @Param('id', ParseUUIDPipe) workId: string) {
    await this.releaseService.unpublish(session, workId);
    return Result.ok(undefined, '作品已下架');
  }
}
