import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SoftDeleteRepository } from 'src/infrastructure/repository';
import { PrismaService } from 'src/infrastructure/prisma';
import { DelFlagEnum } from 'src/shared/enums';

/**
 * 文稿仓储层
 */
@Injectable()
export class ManuscriptRepository extends SoftDeleteRepository<any, Prisma.LitManuscriptDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma, 'litManuscript');
  }

  /**
   * 分页查询用户文稿（按 user_id 过滤）
   */
  async findPageByUserId(userId: number, where: Prisma.LitManuscriptWhereInput, skip: number, take: number) {
    const [list, total] = await this.prisma.$transaction([
      this.delegate.findMany({
        where: { ...where, userId },
        skip,
        take,
        orderBy: { updateTime: 'desc' },
        include: {
          tags: {
            include: { tag: true },
          },
        },
      }),
      this.delegate.count({ where: { ...where, userId } }),
    ]);

    return {
      list: list.map((m: any) => ({
        ...m,
        tags: m.tags.map((t: any) => ({
          tagId: t.tag.tagId,
          tagName: t.tag.tagName,
          color: t.tag.color,
        })),
      })),
      total,
    };
  }

  /**
   * 查询用户最近的 N 篇文稿
   */
  async findRecentByUserId(userId: number, limit = 10) {
    const list = await this.delegate.findMany({
      where: { userId, delFlag: DelFlagEnum.NORMAL },
      orderBy: { updateTime: 'desc' },
      take: limit,
      include: {
        tags: {
          include: { tag: { select: { tagId: true, tagName: true, color: true } } },
        },
      },
    });

    return list.map((m: any) => ({
      ...m,
      tags: m.tags.map((t: any) => ({
        tagId: t.tag.tagId,
        tagName: t.tag.tagName,
        color: t.tag.color,
      })),
    }));
  }

  /**
   * 按 ID 查询（仅限属主）
   */
  async findOneByUserId(manuscriptId: number, userId: number) {
    return this.delegate.findFirst({
      where: { manuscriptId, userId },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });
  }

  /**
   * 更新标签关联（先删后建）
   */
  async replaceTags(manuscriptId: number, tagIds: number[]) {
    await this.prisma.client.litManuscriptTag.deleteMany({ where: { manuscriptId } });
    if (tagIds.length > 0) {
      await this.prisma.client.litManuscriptTag.createMany({
        data: tagIds.map((tagId) => ({ manuscriptId, tagId })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * 统计指定状态数量
   */
  async countByUserIdAndStatus(userId: number, status: string) {
    return this.delegate.count({
      where: { userId, status, delFlag: DelFlagEnum.NORMAL },
    });
  }

  /**
   * 统计总字数
   */
  async sumWordCountByUserId(userId: number) {
    const result = await this.prisma.client.litManuscript.aggregate({
      where: { userId, delFlag: DelFlagEnum.NORMAL },
      _sum: { wordCount: true },
    });
    return result._sum.wordCount ?? 0;
  }
}
