import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SoftDeleteRepository } from 'src/infrastructure/repository';
import { PrismaService } from 'src/infrastructure/prisma';
import { DelFlagEnum } from 'src/shared/enums';

/**
 * 素材仓储层
 */
@Injectable()
export class MaterialRepository extends SoftDeleteRepository<any, Prisma.LitMaterialDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma, 'litMaterial');
  }

  /**
   * 分页查询用户素材
   */
  async findPageByUserId(userId: number, where: Prisma.LitMaterialWhereInput, skip: number, take: number) {
    const [list, total] = await this.prisma.$transaction([
      this.delegate.findMany({
        where: { ...where, userId },
        skip,
        take,
        orderBy: { updateTime: 'desc' },
      }),
      this.delegate.count({ where: { ...where, userId } }),
    ]);

    return { list, total };
  }

  async findOneByUserId(materialId: number, userId: number) {
    return this.delegate.findFirst({
      where: { materialId, userId, delFlag: DelFlagEnum.NORMAL },
    });
  }

  async countByUserId(userId: number) {
    return this.delegate.count({ where: { userId, delFlag: DelFlagEnum.NORMAL } });
  }
}
