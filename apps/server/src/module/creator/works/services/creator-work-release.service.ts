import { Injectable } from '@nestjs/common';
import {
  CreatorWork,
  CreatorWorkPublishStatus,
  CreatorWorkSubmissionStatus,
  CreatorWorkSubmissionType,
  Prisma,
} from '@prisma/client';
import { BusinessException } from 'src/shared/exceptions';
import { ResponseCode } from 'src/shared/response';
import { CreatorSession } from '../../common';
import {
  CreatorReleaseManagementResponseDto,
  CreatorReleasePageRequestDto,
  CreatorWorkSubmitRequestDto,
  toCreatorWorkResponse,
} from '../dto';
import { CreatorWorkRepository } from '../repositories/creator-work.repository';
import { CreatorWorkSubmissionRepository } from '../repositories/creator-work-submission.repository';
import { CreatorWorkTagRepository } from '../repositories/creator-work-tag.repository';

@Injectable()
export class CreatorWorkReleaseService {
  constructor(
    private readonly workRepository: CreatorWorkRepository,
    private readonly tagRepository: CreatorWorkTagRepository,
    private readonly submissionRepository: CreatorWorkSubmissionRepository,
  ) {}

  async submit(session: CreatorSession, workId: string, dto: CreatorWorkSubmitRequestDto): Promise<void> {
    const work = await this.workRepository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    BusinessException.throwIf(
      work.publishStatus !== CreatorWorkPublishStatus.OFFLINE &&
        work.publishStatus !== CreatorWorkPublishStatus.REJECTED,
      '当前作品状态不能提交发布审核',
      ResponseCode.BUSINESS_ERROR,
    );
    const active = await this.submissionRepository.findActiveByWork(session.id, workId);
    BusinessException.throwIf(Boolean(active), '作品已有审核中的申请', ResponseCode.DATA_IN_USE);

    const tag = dto.tagCode ? await this.tagRepository.findEnabledByCode(dto.tagCode) : undefined;
    BusinessException.throwIf(Boolean(dto.tagCode && !tag), '作品标签不存在或已停用', ResponseCode.DATA_NOT_FOUND);

    await this.submissionRepository.submit({
      workId,
      creatorId: session.id,
      tagId: tag?.id,
      type: CreatorWorkSubmissionType.PUBLISH,
      status: CreatorWorkSubmissionStatus.REVIEWING,
      nextWorkStatus: CreatorWorkPublishStatus.REVIEWING,
      version: work.workVersion + 1,
      snapshot: this.buildSnapshot(work),
      remark: dto.remark,
    });
  }

  async submitUpdate(session: CreatorSession, workId: string, dto: CreatorWorkSubmitRequestDto): Promise<void> {
    const work = await this.workRepository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    BusinessException.throwIf(
      work.publishStatus !== CreatorWorkPublishStatus.PUBLISHED,
      '只有已发布作品可以提交更新审核',
      ResponseCode.BUSINESS_ERROR,
    );
    const active = await this.submissionRepository.findActiveByWork(session.id, workId);
    BusinessException.throwIf(Boolean(active), '作品已有审核中的申请', ResponseCode.DATA_IN_USE);

    const tag = dto.tagCode ? await this.tagRepository.findEnabledByCode(dto.tagCode) : undefined;
    BusinessException.throwIf(Boolean(dto.tagCode && !tag), '作品标签不存在或已停用', ResponseCode.DATA_NOT_FOUND);

    await this.submissionRepository.submit({
      workId,
      creatorId: session.id,
      tagId: tag?.id,
      type: CreatorWorkSubmissionType.UPDATE,
      status: CreatorWorkSubmissionStatus.REVIEWING,
      nextWorkStatus: CreatorWorkPublishStatus.PUBLISHED,
      version: work.workVersion + 1,
      snapshot: this.buildSnapshot(work),
      remark: dto.remark,
    });
  }

  async withdraw(session: CreatorSession, workId: string): Promise<void> {
    const work = await this.workRepository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    const active = await this.submissionRepository.findActiveByWork(session.id, workId);
    BusinessException.throwIfNull(active, '作品没有审核中的申请', ResponseCode.DATA_NOT_FOUND);
    const nextWorkStatus =
      active.type === CreatorWorkSubmissionType.UPDATE
        ? CreatorWorkPublishStatus.PUBLISHED
        : CreatorWorkPublishStatus.OFFLINE;
    const withdrawn = await this.submissionRepository.withdraw({
      creatorId: session.id,
      workId,
      submissionId: active.id,
      nextWorkStatus,
    });
    BusinessException.throwIf(!withdrawn, '撤回审核失败，请刷新后重试', ResponseCode.OPERATION_FAILED);
  }

  async pageReleases(
    session: CreatorSession,
    query: CreatorReleasePageRequestDto,
  ): Promise<CreatorReleaseManagementResponseDto> {
    const [stats, pageData] = await Promise.all([
      this.workRepository.countReleaseStats(session.id),
      this.workRepository.findReleasePage(session.id, query),
    ]);
    return {
      ...stats,
      page: {
        list: pageData.list.map(toCreatorWorkResponse),
        total: pageData.total,
        pageNumber: query.pageNumber,
        nextPage: query.skip + pageData.list.length < pageData.total,
      },
    };
  }

  listTags() {
    return this.tagRepository.findEnabled();
  }

  async pageCandidates(session: CreatorSession, query: CreatorReleasePageRequestDto) {
    const pageData = await this.workRepository.findReleaseCandidates(session.id, query);
    return {
      list: pageData.list.map(toCreatorWorkResponse),
      total: pageData.total,
      pageNumber: query.pageNumber,
      nextPage: query.skip + pageData.list.length < pageData.total,
    };
  }

  async unpublish(session: CreatorSession, workId: string): Promise<void> {
    const work = await this.workRepository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    BusinessException.throwIf(
      work.publishStatus !== CreatorWorkPublishStatus.PUBLISHED,
      '只有已发布作品可以下架',
      ResponseCode.BUSINESS_ERROR,
    );
    const active = await this.submissionRepository.findActiveByWork(session.id, workId);
    BusinessException.throwIf(Boolean(active), '作品存在审核中的更新，请先撤回', ResponseCode.DATA_IN_USE);
    const unpublished = await this.submissionRepository.unpublish(session.id, workId);
    BusinessException.throwIf(!unpublished, '作品下架失败，请刷新后重试', ResponseCode.OPERATION_FAILED);
  }

  async removeFromReleases(session: CreatorSession, workId: string): Promise<void> {
    const work = await this.workRepository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    BusinessException.throwIf(
      work.publishStatus === CreatorWorkPublishStatus.REVIEWING ||
        work.publishStatus === CreatorWorkPublishStatus.PUBLISHED,
      '审核中或已发布的作品不能从发布管理移除',
      ResponseCode.DATA_IN_USE,
    );
    const removed = await this.submissionRepository.clearRelease(session.id, workId);
    BusinessException.throwIf(!removed, '移除失败，请刷新后重试', ResponseCode.OPERATION_FAILED);
  }

  private buildSnapshot(work: CreatorWork): Prisma.InputJsonObject {
    return {
      title: work.title,
      type: work.type,
      coverUrl: work.coverUrl,
      gifFileUrl: work.gifFileUrl,
      gifFileSize: work.gifFileSize?.toString() ?? null,
      editableFileUrl: work.editableFileUrl,
      binFileUrl: work.binFileUrl,
      binFileSize: work.binFileSize?.toString() ?? null,
      width: work.width,
      height: work.height,
      frameCount: work.frameCount,
      frameDelay: work.frameDelay,
      preview: work.preview,
      remark: work.remark,
    };
  }
}
