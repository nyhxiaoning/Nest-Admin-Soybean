import { Injectable } from '@nestjs/common';
import { ResponseCode, Result } from 'src/shared/response';
import { BusinessException } from 'src/shared/exceptions';
import { ManuscriptRepository } from './manuscript.repository';
import {
  BindTagsRequestDto,
  ChangeStatusRequestDto,
  CreateManuscriptRequestDto,
  ListManuscriptRequestDto,
  SaveManuscriptRequestDto,
  UpdateManuscriptRequestDto,
} from './dto/requests';
import { ManuscriptDetailResponseDto, ManuscriptResponseDto } from './dto/responses';
import { toDto, toDtoList } from 'src/shared/utils/serialize.util';
import { InjectTransactionHost, PrismaTransactionHost } from 'src/core/decorators/transactional.decorator';

@Injectable()
export class ManuscriptService {
  constructor(
    private readonly manuscriptRepo: ManuscriptRepository,
    @InjectTransactionHost() private readonly txHost: PrismaTransactionHost,
  ) {}

  private get prisma() {
    return this.txHost.tx;
  }

  async create(createDto: CreateManuscriptRequestDto, userId: number) {
    const data = await this.manuscriptRepo.create({
      userId,
      title: createDto.title,
      content: createDto.content || '',
      status: '0', // 草稿
      wordCount: 0,
    });
    return Result.ok(toDto(ManuscriptResponseDto, data));
  }

  async list(query: ListManuscriptRequestDto, userId: number) {
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.title = { contains: query.keyword };
    }

    const { list, total } = await this.manuscriptRepo.findPageByUserId(userId, where, query.skip, query.take);

    return Result.page(toDtoList(ManuscriptResponseDto, list), total, query.pageNum, query.pageSize);
  }

  async detail(manuscriptId: number, userId: number) {
    const data = await this.manuscriptRepo.findOneByUserId(manuscriptId, userId);
    BusinessException.throwIfNull(data, '文稿不存在', ResponseCode.DATA_NOT_FOUND);
    return Result.ok(toDto(ManuscriptDetailResponseDto, data));
  }

  async update(updateDto: UpdateManuscriptRequestDto, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(updateDto.manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);

    const data = await this.manuscriptRepo.update(updateDto.manuscriptId, {
      title: updateDto.title,
      content: updateDto.content,
      wordCount: updateDto.wordCount,
      updateBy: String(userId),
    });

    return Result.ok(toDto(ManuscriptResponseDto, data));
  }

  async save(saveDto: SaveManuscriptRequestDto, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(saveDto.manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);

    const data = await this.manuscriptRepo.update(saveDto.manuscriptId, {
      content: saveDto.content,
      wordCount: saveDto.wordCount ?? 0,
      updateBy: String(userId),
    });

    return Result.ok(toDto(ManuscriptResponseDto, data));
  }

  async changeStatus(changeDto: ChangeStatusRequestDto, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(changeDto.manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);

    const data = await this.manuscriptRepo.update(changeDto.manuscriptId, {
      status: changeDto.status,
      updateBy: String(userId),
    });

    return Result.ok(toDto(ManuscriptResponseDto, data));
  }

  async copy(manuscriptId: number, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);

    const data = await this.manuscriptRepo.create({
      userId,
      title: `${existing.title} 副本`,
      content: existing.content,
      wordCount: existing.wordCount,
      status: '0', // 草稿
    });

    return Result.ok(toDto(ManuscriptResponseDto, data));
  }

  async remove(manuscriptId: number, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);

    // 移到回收站：status = '3'，delFlag 保持 '0'
    await this.manuscriptRepo.update(manuscriptId, {
      status: '3',
      updateBy: String(userId),
    });

    return Result.ok(null, '已移至回收站');
  }

  async permanentDelete(manuscriptId: number, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);

    // 先清关联再真删
    await this.prisma.client.litManuscriptTag.deleteMany({ where: { manuscriptId } });
    await this.manuscriptRepo.delete(manuscriptId);

    return Result.ok(null, '已永久删除');
  }

  async restore(manuscriptId: number, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);

    const data = await this.manuscriptRepo.update(manuscriptId, {
      status: '0', // 恢复为草稿
      updateBy: String(userId),
    });

    return Result.ok(toDto(ManuscriptResponseDto, data));
  }

  async bindTags(bindDto: BindTagsRequestDto, userId: number) {
    const existing = await this.manuscriptRepo.findOneByUserId(bindDto.manuscriptId, userId);
    BusinessException.throwIfNull(existing, '文稿不存在', ResponseCode.DATA_NOT_FOUND);
    await this.manuscriptRepo.replaceTags(bindDto.manuscriptId, bindDto.tagIds);
    return Result.ok(null, '标签绑定成功');
  }

  async findRecent(userId: number) {
    const list = await this.manuscriptRepo.findRecentByUserId(userId, 10);
    return Result.ok(toDtoList(ManuscriptResponseDto, list));
  }
}
