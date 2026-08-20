import { CreatorWorkResponseDto } from './creator-work.response.dto';

export interface CreatorWorkPageResponseDto {
  list: CreatorWorkResponseDto[];
  total: number;
  pageNumber: number;
  nextPage: boolean;
}
