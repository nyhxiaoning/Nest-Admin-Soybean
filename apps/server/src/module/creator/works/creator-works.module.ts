import { Module } from '@nestjs/common';
import { CreatorAuthModule } from '../auth/creator-auth.module';
import { CreatorStorageModule } from '../storage/creator-storage.module';
import { CreatorWorkTagsController } from './controllers/creator-work-tags.controller';
import { CreatorWorksController } from './controllers/creator-works.controller';
import { CreatorWorkRepository } from './repositories/creator-work.repository';
import { CreatorWorkSubmissionRepository } from './repositories/creator-work-submission.repository';
import { CreatorWorkTagRepository } from './repositories/creator-work-tag.repository';
import { CreatorWorkReleaseService } from './services/creator-work-release.service';
import { CreatorWorkUploadService } from './services/creator-work-upload.service';
import { CreatorWorksService } from './services/creator-works.service';

@Module({
  imports: [CreatorAuthModule, CreatorStorageModule],
  controllers: [CreatorWorksController, CreatorWorkTagsController],
  providers: [
    CreatorWorkRepository,
    CreatorWorkTagRepository,
    CreatorWorkSubmissionRepository,
    CreatorWorksService,
    CreatorWorkReleaseService,
    CreatorWorkUploadService,
  ],
})
export class CreatorWorksModule {}
