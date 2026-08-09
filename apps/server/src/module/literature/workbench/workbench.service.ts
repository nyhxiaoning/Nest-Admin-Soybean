import { Injectable } from '@nestjs/common';
import { Result } from 'src/shared/response';
import { ManuscriptRepository } from '../manuscript/manuscript.repository';
import { MaterialRepository } from '../material/material.repository';
import { TagRepository } from '../tag/tag.repository';
import { ManuscriptResponseDto, WorkbenchOverviewResponseDto } from '../manuscript/dto/responses';
import { toDtoList } from 'src/shared/utils/serialize.util';
import { ManuscriptStatus } from '../literature.constant';

@Injectable()
export class WorkbenchService {
  constructor(
    private readonly manuscriptRepo: ManuscriptRepository,
    private readonly materialRepo: MaterialRepository,
    private readonly tagRepo: TagRepository,
  ) {}

  /**
   * 工作台概览：统计 + 最近文稿
   */
  async overview(userId: number) {
    const [totalDrafts, totalPublished, totalArchived, totalWords, totalMaterials, totalTags, recent] =
      await Promise.all([
        this.manuscriptRepo.countByUserIdAndStatus(userId, ManuscriptStatus.DRAFT),
        this.manuscriptRepo.countByUserIdAndStatus(userId, ManuscriptStatus.PUBLISHED),
        this.manuscriptRepo.countByUserIdAndStatus(userId, ManuscriptStatus.ARCHIVED),
        this.manuscriptRepo.sumWordCountByUserId(userId),
        this.materialRepo.countByUserId(userId),
        this.tagRepo.count({ userId, delFlag: '0' }),
        this.manuscriptRepo.findRecentByUserId(userId, 10),
      ]);

    const data: WorkbenchOverviewResponseDto = {
      totalDrafts,
      totalPublished,
      totalArchived,
      totalWords,
      totalMaterials,
      totalTags,
      recent: toDtoList(ManuscriptResponseDto, recent) as ManuscriptResponseDto[],
    };

    return Result.ok(data);
  }
}
