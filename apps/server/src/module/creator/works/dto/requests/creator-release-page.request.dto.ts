import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorWorkPublishStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreatorWorkPageRequestDto } from './creator-work-page.request.dto';

export class CreatorReleasePageRequestDto extends CreatorWorkPageRequestDto {
  @ApiPropertyOptional({ enum: CreatorWorkPublishStatus })
  @IsOptional()
  @IsEnum(CreatorWorkPublishStatus)
  status?: CreatorWorkPublishStatus;
}
