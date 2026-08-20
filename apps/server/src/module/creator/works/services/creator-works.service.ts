import { Injectable } from '@nestjs/common';
import { CreatorWorkPublishStatus, CreatorWorkType, Prisma } from '@prisma/client';
import { CreatorSession } from '../../common';
import { BusinessException } from 'src/shared/exceptions';
import { ResponseCode } from 'src/shared/response';
import {
  CreatorWorkPageRequestDto,
  CreatorWorkPageResponseDto,
  CreatorWorkSaveRequestDto,
  toCreatorWorkResponse,
} from '../dto';
import { CreatorWorkRepository } from '../repositories/creator-work.repository';

@Injectable()
export class CreatorWorksService {
  constructor(private readonly repository: CreatorWorkRepository) {}

  async create(session: CreatorSession, dto: CreatorWorkSaveRequestDto): Promise<string> {
    const data: Prisma.CreatorWorkUncheckedCreateInput = {
      creatorId: session.id,
      title: dto.title.trim(),
      type: dto.type ?? CreatorWorkType.STATIC,
      coverUrl: dto.coverUrl,
      gifFileUrl: dto.gifFileUrl,
      gifFileSize: dto.gifFileSize === undefined ? undefined : BigInt(dto.gifFileSize),
      editableFileUrl: dto.editableFileUrl,
      binFileUrl: dto.binFileUrl,
      binFileSize: dto.binFileSize === undefined ? undefined : BigInt(dto.binFileSize),
      width: dto.width,
      height: dto.height,
      frameCount: dto.frameCount,
      frameDelay: dto.frameDelay,
      preview: dto.preview,
      remark: dto.remark,
      publishStatus: CreatorWorkPublishStatus.OFFLINE,
    };
    const work = await this.repository.create(data);
    return work.id;
  }

  async page(session: CreatorSession, query: CreatorWorkPageRequestDto): Promise<CreatorWorkPageResponseDto> {
    const { list, total } = await this.repository.findPage(session.id, query);
    return {
      list: list.map(toCreatorWorkResponse),
      total,
      pageNumber: query.pageNumber,
      nextPage: query.skip + list.length < total,
    };
  }

  async detail(session: CreatorSession, workId: string) {
    const work = await this.repository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    await this.repository.touchLastView(session.id, workId, new Date());
    return toCreatorWorkResponse(work);
  }

  async update(session: CreatorSession, workId: string, dto: CreatorWorkSaveRequestDto): Promise<void> {
    const work = await this.repository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    const data: Prisma.CreatorWorkUncheckedUpdateInput = {
      title: dto.title.trim(),
      type: dto.type,
      coverUrl: dto.coverUrl,
      gifFileUrl: dto.gifFileUrl,
      gifFileSize: dto.gifFileSize === undefined ? undefined : BigInt(dto.gifFileSize),
      editableFileUrl: dto.editableFileUrl,
      binFileUrl: dto.binFileUrl,
      binFileSize: dto.binFileSize === undefined ? undefined : BigInt(dto.binFileSize),
      width: dto.width,
      height: dto.height,
      frameCount: dto.frameCount,
      frameDelay: dto.frameDelay,
      preview: dto.preview,
      remark: dto.remark,
      ...(work.publishedSnapshot ? { contentConsistent: false } : {}),
    };
    const updated = await this.repository.updateOwned(session.id, workId, data);
    BusinessException.throwIf(!updated, '作品不存在', ResponseCode.DATA_NOT_FOUND);
  }

  async remove(session: CreatorSession, workId: string): Promise<void> {
    const work = await this.repository.findOwnedById(session.id, workId);
    BusinessException.throwIfNull(work, '作品不存在', ResponseCode.DATA_NOT_FOUND);
    BusinessException.throwIf(
      work.publishStatus === CreatorWorkPublishStatus.REVIEWING ||
        work.publishStatus === CreatorWorkPublishStatus.PUBLISHED,
      '审核中或已发布的作品不能直接删除，请先撤回或下架',
      ResponseCode.DATA_IN_USE,
    );
    const deleted = await this.repository.softDeleteOwned(session.id, workId, new Date());
    BusinessException.throwIf(!deleted, '作品不存在', ResponseCode.DATA_NOT_FOUND);
  }
}
