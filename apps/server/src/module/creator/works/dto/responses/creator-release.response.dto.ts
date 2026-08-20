import { CreatorWorkPageResponseDto } from './creator-work-page.response.dto';

export interface CreatorReleaseManagementResponseDto {
  publishedCount: number;
  reviewingCount: number;
  applicableCount: number;
  page: CreatorWorkPageResponseDto;
}
