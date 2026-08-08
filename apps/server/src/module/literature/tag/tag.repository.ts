import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SoftDeleteRepository } from 'src/infrastructure/repository';
import { PrismaService } from 'src/infrastructure/prisma';
import { DelFlagEnum } from 'src/shared/enums';

/**
 * 标签仓储层
 */
@Injectable()
export class TagRepository extends SoftDeleteRepository<any, Prisma.LitTagDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma, 'litTag');
  }

  /**
   * 分页查询用户标签（含关联文稿数）
   */
  async findPageByUserId(userId: number, where: Prisma.LitTagWhereInput, skip: number, take: number) {
    const [list, total] = await this.prisma.$transaction([
      this.delegate.findMany({
        where: { ...where, userId },
        skip,
        take,
        orderBy: { updateTime: 'desc' },
      }),
      this.delegate.count({ where: { ...where, userId } }),
    ]);

    // 补充关联文稿数
    const result = await Promise.all(
      list.map(async (tag) => {
        const count = await this.prisma.client.litManuscriptTag.count({
          where: { tagId: tag.tagId },
        });
        return { ...tag, manuscriptCount: count };
      }),
    );

    return { list: result, total };
  }

  async findOneByUserId(tagId: number, userId: number) {
    return this.delegate.findFirst({
      where: { tagId, userId, delFlag: DelFlagEnum.NORMAL },
    });
  }

  async findByIds(tagIds: number[]) {
    return this.delegate.findMany({
      where: { tagId: { in: tagIds } },
    });
  }
}
