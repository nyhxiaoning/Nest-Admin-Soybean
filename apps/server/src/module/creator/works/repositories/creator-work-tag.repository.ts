import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma';
import { DEFAULT_CREATOR_WORK_TAGS } from '../constants/creator-work-tag.defaults';

@Injectable()
export class CreatorWorkTagRepository implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.creatorWorkTag.createMany({
      data: DEFAULT_CREATOR_WORK_TAGS.map((tag) => ({ ...tag })),
      skipDuplicates: true,
    });
  }

  findEnabledByCode(tagCode: string) {
    return this.prisma.creatorWorkTag.findFirst({ where: { tagCode, enabled: true } });
  }

  findEnabled() {
    return this.prisma.creatorWorkTag.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { tagCode: 'asc' }],
      select: { id: true, name: true, tagCode: true },
    });
  }
}
