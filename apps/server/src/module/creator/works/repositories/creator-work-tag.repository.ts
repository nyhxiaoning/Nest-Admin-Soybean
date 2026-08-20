import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma';

@Injectable()
export class CreatorWorkTagRepository {
  constructor(private readonly prisma: PrismaService) {}

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
