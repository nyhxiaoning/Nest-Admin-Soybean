import { Injectable } from '@nestjs/common';
import { ResponseCode, Result } from 'src/shared/response';
import { BusinessException } from 'src/shared/exceptions';
import { MaterialRepository } from './material.repository';
import { CreateMaterialRequestDto, ListMaterialRequestDto, UpdateMaterialRequestDto } from './dto/requests';
import { MaterialResponseDto } from './dto/responses';
import { toDto, toDtoList } from 'src/shared/utils/serialize.util';

@Injectable()
export class MaterialService {
  constructor(private readonly materialRepo: MaterialRepository) {}

  async create(createDto: CreateMaterialRequestDto, userId: number) {
    const data = await this.materialRepo.create({
      userId,
      type: createDto.type,
      content: createDto.content,
      source: createDto.source,
    });
    return Result.ok(toDto(MaterialResponseDto, data));
  }

  async list(query: ListMaterialRequestDto, userId: number) {
    const where: Record<string, unknown> = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.keyword) {
      where.content = { contains: query.keyword };
    }

    const { list, total } = await this.materialRepo.findPageByUserId(userId, where, query.skip, query.take);

    return Result.page(toDtoList(MaterialResponseDto, list), total, query.pageNum, query.pageSize);
  }

  async detail(materialId: number, userId: number) {
    const data = await this.materialRepo.findOneByUserId(materialId, userId);
    BusinessException.throwIfNull(data, '素材不存在', ResponseCode.DATA_NOT_FOUND);
    return Result.ok(toDto(MaterialResponseDto, data));
  }

  async update(updateDto: UpdateMaterialRequestDto, userId: number) {
    const existing = await this.materialRepo.findOneByUserId(updateDto.materialId, userId);
    BusinessException.throwIfNull(existing, '素材不存在', ResponseCode.DATA_NOT_FOUND);

    const data = await this.materialRepo.update(updateDto.materialId, {
      type: updateDto.type,
      content: updateDto.content,
      source: updateDto.source,
      updateBy: String(userId),
    });

    return Result.ok(toDto(MaterialResponseDto, data));
  }

  async remove(materialId: number, userId: number) {
    const existing = await this.materialRepo.findOneByUserId(materialId, userId);
    BusinessException.throwIfNull(existing, '素材不存在', ResponseCode.DATA_NOT_FOUND);
    await this.materialRepo.softDelete(materialId);
    return Result.ok(null, '删除成功');
  }
}
