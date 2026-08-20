import { Injectable } from '@nestjs/common';
import {
  CreatorWorkPublishStatus,
  CreatorWorkSubmissionStatus,
  CreatorWorkSubmissionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma';

export interface SubmitCreatorWorkInput {
  workId: string;
  creatorId: string;
  tagId?: string;
  type: CreatorWorkSubmissionType;
  status: CreatorWorkSubmissionStatus;
  nextWorkStatus: CreatorWorkPublishStatus;
  version: number;
  snapshot: Prisma.InputJsonValue;
  remark?: string;
}

export interface WithdrawCreatorWorkInput {
  creatorId: string;
  workId: string;
  submissionId: string;
  nextWorkStatus: CreatorWorkPublishStatus;
}

@Injectable()
export class CreatorWorkSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByWork(creatorId: string, workId: string) {
    return this.prisma.creatorWorkSubmission.findFirst({
      where: { creatorId, workId, status: CreatorWorkSubmissionStatus.REVIEWING },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async submit(input: SubmitCreatorWorkInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.creatorWork.updateMany({
        where: { id: input.workId, creatorId: input.creatorId, deletedAt: null },
        data: {
          publishStatus: input.nextWorkStatus,
          submittedAt: new Date(),
          rejectedReason: null,
          workVersion: input.version,
        },
      });
      if (updated.count !== 1) throw new Error('CREATOR_WORK_NOT_FOUND');

      await tx.creatorWorkSubmission.create({
        data: {
          workId: input.workId,
          creatorId: input.creatorId,
          type: input.type,
          status: input.status,
          version: input.version,
          snapshot: input.snapshot,
          remark: input.remark,
        },
      });

      if (input.tagId) {
        await tx.creatorWorkTagRelation.deleteMany({ where: { workId: input.workId } });
        await tx.creatorWorkTagRelation.create({ data: { workId: input.workId, tagId: input.tagId } });
      }
    });
  }

  async withdraw(input: WithdrawCreatorWorkInput): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.creatorWorkSubmission.updateMany({
        where: {
          id: input.submissionId,
          workId: input.workId,
          creatorId: input.creatorId,
          status: CreatorWorkSubmissionStatus.REVIEWING,
        },
        data: { status: CreatorWorkSubmissionStatus.WITHDRAWN },
      });
      if (submission.count !== 1) return false;
      const work = await tx.creatorWork.updateMany({
        where: { id: input.workId, creatorId: input.creatorId, deletedAt: null },
        data: { publishStatus: input.nextWorkStatus, submittedAt: null },
      });
      return work.count === 1;
    });
  }

  async unpublish(creatorId: string, workId: string): Promise<boolean> {
    const result = await this.prisma.creatorWork.updateMany({
      where: {
        id: workId,
        creatorId,
        deletedAt: null,
        publishStatus: CreatorWorkPublishStatus.PUBLISHED,
      },
      data: {
        publishStatus: CreatorWorkPublishStatus.OFFLINE,
        publishedSnapshot: Prisma.DbNull,
        contentConsistent: true,
        submittedAt: null,
      },
    });
    return result.count === 1;
  }

  async clearRelease(creatorId: string, workId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const work = await tx.creatorWork.updateMany({
        where: {
          id: workId,
          creatorId,
          deletedAt: null,
          publishStatus: { in: [CreatorWorkPublishStatus.OFFLINE, CreatorWorkPublishStatus.REJECTED] },
        },
        data: { rejectedReason: null, submittedAt: null },
      });
      if (work.count !== 1) return false;
      await tx.creatorWorkTagRelation.deleteMany({ where: { workId } });
      return true;
    });
  }
}
