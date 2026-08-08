import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Result } from 'src/shared/response';
import { toDtoList } from 'src/shared/utils/index';
import { ListMailLogDto, MailLogResponseDto } from './dto/index';
import { MailLogRepository } from './mail-log.repository';

@Injectable()
export class MailLogService {
  constructor(private readonly mailLogRepo: MailLogRepository) {}

  /**
   * 分页查询邮件日志列表
   */
  async findAll(query: ListMailLogDto) {
    const where: Prisma.SysMailLogWhereInput = {};

    if (query.toMail) {
      where.toMail = {
        contains: query.toMail,
      };
    }

    if (query.templateCode) {
      where.templateCode = {
        contains: query.templateCode,
      };
    }

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (query.sendStatus !== undefined) {
      where.sendStatus = query.sendStatus;
    }

    if (query.params?.beginTime && query.params?.endTime) {
      where.sendTime = {
        gte: new Date(query.params.beginTime),
        lte: new Date(query.params.endTime),
      };
    }

    const { list, total } = await this.mailLogRepo.findPageWithFilter(where, query.skip, query.take);

    // 转换 BigInt 为字符串
    const rows = list.map((item) => ({
      ...item,
      id: item.id.toString(),
    }));

    return Result.ok({
      rows: toDtoList(MailLogResponseDto, rows),
      total,
    });
  }

  /**
   * 根据ID查询邮件日志详情
   */
  async findOne(id: string) {
    const data = await this.mailLogRepo.findById(BigInt(id));
    if (!data) {
      throw new BadRequestException('邮件日志不存在');
    }

    return Result.ok({
      ...data,
      id: data.id.toString(),
    });
  }

  /**
   * 统计发送状态
   */
  async getStats() {
    const [sending, success, failed] = await Promise.all([
      this.mailLogRepo.countByStatus(0),
      this.mailLogRepo.countByStatus(1),
      this.mailLogRepo.countByStatus(2),
    ]);

    return Result.ok({
      sending,
      success,
      failed,
      total: sending + success + failed,
    });
  }
}
