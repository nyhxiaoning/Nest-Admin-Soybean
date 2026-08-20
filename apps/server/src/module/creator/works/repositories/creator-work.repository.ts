import { Injectable } from '@nestjs/common';
import {
  CreatorWorkPublishStatus,
  CreatorWorkSubmissionStatus,
  CreatorWorkSubmissionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma';
import { CREATOR_WORK_SORT_FIELD } from '../constants/creator-work.constants';
import { CreatorReleasePageRequestDto, CreatorWorkPageRequestDto } from '../dto';

@Injectable()
export class CreatorWorkRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CreatorWorkUncheckedCreateInput) {
    return this.prisma.creatorWork.create({ data });
  }

  async findPage(creatorId: string, query: CreatorWorkPageRequestDto) {
    const keyword = query.keyword?.trim();
    const where: Prisma.CreatorWorkWhereInput = {
      creatorId,
      deletedAt: null,
      ...(keyword ? { title: { contains: keyword, mode: 'insensitive' } } : {}),
    };
    const sortField = CREATOR_WORK_SORT_FIELD[query.sortBy];
    const direction = query.direction.toLowerCase() as Prisma.SortOrder;
    const [list, total] = await this.prisma.$transaction([
      this.prisma.creatorWork.findMany({
        where,
        include: { creator: { select: { name: true } } },
        orderBy: [{ [sortField]: direction }, { id: direction }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.creatorWork.count({ where }),
    ]);
    return { list, total };
  }

  findOwnedById(creatorId: string, workId: string) {
    return this.prisma.creatorWork.findFirst({
      where: { id: workId, creatorId, deletedAt: null },
      include: { creator: { select: { name: true } } },
    });
  }

  async touchLastView(creatorId: string, workId: string, viewedAt: Date): Promise<void> {
    await this.prisma.creatorWork.updateMany({
      where: { id: workId, creatorId, deletedAt: null },
      data: { lastViewAt: viewedAt },
    });
  }

  async updateOwned(creatorId: string, workId: string, data: Prisma.CreatorWorkUncheckedUpdateInput): Promise<boolean> {
    const result = await this.prisma.creatorWork.updateMany({
      where: { id: workId, creatorId, deletedAt: null },
      data,
    });
    return result.count === 1;
  }

  async softDeleteOwned(creatorId: string, workId: string, deletedAt: Date): Promise<boolean> {
    const result = await this.prisma.creatorWork.updateMany({
      where: { id: workId, creatorId, deletedAt: null },
      data: { deletedAt },
    });
    return result.count === 1;
  }

  async countReleaseStats(creatorId: string) {
    const base = { creatorId, deletedAt: null } as const;
    const [publishedCount, reviewingCount, applicableCount] = await this.prisma.$transaction([
      this.prisma.creatorWork.count({ where: { ...base, publishStatus: CreatorWorkPublishStatus.PUBLISHED } }),
      this.prisma.creatorWork.count({
        where: {
          ...base,
          OR: [
            { publishStatus: CreatorWorkPublishStatus.REVIEWING },
            {
              submissions: {
                some: {
                  status: CreatorWorkSubmissionStatus.REVIEWING,
                  type: CreatorWorkSubmissionType.UPDATE,
                },
              },
            },
          ],
        },
      }),
      this.prisma.creatorWork.count({
        where: {
          ...base,
          publishStatus: { in: [CreatorWorkPublishStatus.OFFLINE, CreatorWorkPublishStatus.REJECTED] },
        },
      }),
    ]);
    return { publishedCount, reviewingCount, applicableCount };
  }

  async findReleasePage(creatorId: string, query: CreatorReleasePageRequestDto) {
    const keyword = query.keyword?.trim();
    const where: Prisma.CreatorWorkWhereInput = {
      creatorId,
      deletedAt: null,
      ...(query.status ? { publishStatus: query.status } : {}),
      ...(keyword ? { title: { contains: keyword, mode: 'insensitive' } } : {}),
    };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.creatorWork.findMany({
        where,
        include: { creator: { select: { name: true } } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.creatorWork.count({ where }),
    ]);
    return { list, total };
  }

  async findReleaseCandidates(creatorId: string, query: CreatorWorkPageRequestDto) {
    const keyword = query.keyword?.trim();
    const where: Prisma.CreatorWorkWhereInput = {
      creatorId,
      deletedAt: null,
      publishStatus: { in: [CreatorWorkPublishStatus.OFFLINE, CreatorWorkPublishStatus.REJECTED] },
      submissions: { none: { status: CreatorWorkSubmissionStatus.REVIEWING } },
      ...(keyword ? { title: { contains: keyword, mode: 'insensitive' } } : {}),
    };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.creatorWork.findMany({
        where,
        include: { creator: { select: { name: true } } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.creatorWork.count({ where }),
    ]);
    return { list, total };
  }
}
