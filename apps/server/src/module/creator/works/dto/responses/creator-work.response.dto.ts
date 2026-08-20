import { CreatorWork, CreatorWorkPublishStatus, CreatorWorkType } from '@prisma/client';

export interface CreatorWorkResponseDto {
  id: string;
  title: string;
  type: CreatorWorkType;
  coverUrl?: string;
  gifFileUrl?: string;
  gifFileSize?: number;
  editableFileUrl?: string;
  binFileUrl?: string;
  binFileSize?: number;
  width?: number;
  height?: number;
  frameCount?: number;
  frameDelay?: number;
  preview?: string;
  publishStatus: CreatorWorkPublishStatus;
  status: CreatorWorkPublishStatus;
  workVersion: string;
  contentConsistent: boolean;
  submittedTime?: number;
  remark?: string;
  rejectedReason?: string;
  lastViewTime?: number;
  createTime: number;
  updateTime: number;
  creatorId: string;
  creatorName?: string;
}

type WorkWithCreator = CreatorWork & { creator?: { name: string } };

function optional<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

function safeNumber(value: bigint | null): number | undefined {
  if (value === null) return undefined;
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) ? numberValue : undefined;
}

export function toCreatorWorkResponse(work: WorkWithCreator): CreatorWorkResponseDto {
  return {
    id: work.id,
    title: work.title,
    type: work.type,
    coverUrl: optional(work.coverUrl),
    gifFileUrl: optional(work.gifFileUrl),
    gifFileSize: safeNumber(work.gifFileSize),
    editableFileUrl: optional(work.editableFileUrl),
    binFileUrl: optional(work.binFileUrl),
    binFileSize: safeNumber(work.binFileSize),
    width: optional(work.width),
    height: optional(work.height),
    frameCount: optional(work.frameCount),
    frameDelay: optional(work.frameDelay),
    preview: optional(work.preview),
    publishStatus: work.publishStatus,
    status: work.publishStatus,
    workVersion: String(work.workVersion),
    contentConsistent: work.contentConsistent,
    submittedTime: work.submittedAt?.getTime(),
    remark: optional(work.remark),
    rejectedReason: optional(work.rejectedReason),
    lastViewTime: work.lastViewAt?.getTime(),
    createTime: work.createdAt.getTime(),
    updateTime: work.updatedAt.getTime(),
    creatorId: work.creatorId,
    creatorName: work.creator?.name,
  };
}
