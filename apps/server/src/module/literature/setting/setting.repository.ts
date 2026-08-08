import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from 'src/infrastructure/repository';
import { PrismaService } from 'src/infrastructure/prisma';

/**
 * 编辑室设置仓储层（每用户一条，无软删）
 */
@Injectable()
export class SettingRepository extends BaseRepository<any, Prisma.LitSettingDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma, 'litSetting');
  }

  findByUserId(userId: number) {
    return this.delegate.findFirst({ where: { userId } });
  }

  createDefault(userId: number) {
    return this.delegate.create({
      data: {
        userId,
        fontSize: 16,
        fontFamily: '',
        autosave: '1',
        autosaveInterval: 30,
        exportFormat: 'md',
      },
    });
  }
}
