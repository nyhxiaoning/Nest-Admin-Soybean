import { Injectable } from '@nestjs/common';
import { ResponseCode, Result } from 'src/shared/response';
import { BusinessException } from 'src/shared/exceptions';
import { TagRepository } from './tag.repository';
import { PrismaService } from 'src/infrastructure/prisma';
import { CreateTagRequestDto, ListTagRequestDto, UpdateTagRequestDto } from './dto/requests';
import { TagResponseDto } from './dto/responses';
import { toDto, toDtoList } from 'src/shared/utils/serialize.util';

@Injectable()
export class TagService {
  constructor(
    private readonly tagRepo: TagRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(createDto: CreateTagRequestDto, userId: number) {
    const existing = await this.tagRepo.findOne({
      userId,
      tagName: createDto.tagName,
      delFlag: '0',
    });
    if (existing) {
      BusinessException.throw(ResponseCode.OPERATION_FAILED, '标签名称已存在');
    }

    const data = await this.tagRepo.create({
      userId,
      tagName: createDto.tagName,
      color: createDto.color || '#2080f0',
    });
    return Result.ok(toDto(TagResponseDto, data));
  }

  async list(query: ListTagRequestDto, userId: number) {
    const where: Record<string, unknown> = {};

    if (query.keyword) {
      where.tagName = { contains: query.keyword };
    }

    const { list, total } = await this.tagRepo.findPageByUserId(userId, where, query.skip, query.take);

    return Result.page(toDtoList(TagResponseDto, list), total, query.pageNum, query.pageSize);
  }

  async detail(tagId: number, userId: number) {
    const data = await this.tagRepo.findOneByUserId(tagId, userId);
    BusinessException.throwIfNull(data, '标签不存在', ResponseCode.DATA_NOT_FOUND);
    return Result.ok(toDto(TagResponseDto, data));
  }

  async update(updateDto: UpdateTagRequestDto, userId: number) {
    const existing = await this.tagRepo.findOneByUserId(updateDto.tagId, userId);
    BusinessException.throwIfNull(existing, '标签不存在', ResponseCode.DATA_NOT_FOUND);

    const data = await this.tagRepo.update(updateDto.tagId, {
      tagName: updateDto.tagName,
      color: updateDto.color,
      updateBy: String(userId),
    });

    return Result.ok(toDto(TagResponseDto, data));
  }

  async remove(tagId: number, userId: number) {
    const existing = await this.tagRepo.findOneByUserId(tagId, userId);
    BusinessException.throwIfNull(existing, '标签不存在', ResponseCode.DATA_NOT_FOUND);

    // 删除关联关系
    await this.prisma.client.litManuscriptTag.deleteMany({ where: { tagId } });
    await this.tagRepo.softDelete(tagId);

    return Result.ok(null, '删除成功');
  }
}
