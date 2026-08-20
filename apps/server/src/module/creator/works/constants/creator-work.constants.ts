import { CreatorWorkPublishStatus } from '@prisma/client';

export const CREATOR_WORK_EDITABLE_STATUSES = [
  CreatorWorkPublishStatus.OFFLINE,
  CreatorWorkPublishStatus.REJECTED,
] as const;

export const CREATOR_WORK_SORT_FIELD = {
  CREATED_AT: 'createdAt',
  LAST_VIEW_TIME: 'lastViewAt',
  TITLE: 'title',
} as const;

export const CREATOR_WORK_DEFAULT_PAGE_SIZE = 20;
