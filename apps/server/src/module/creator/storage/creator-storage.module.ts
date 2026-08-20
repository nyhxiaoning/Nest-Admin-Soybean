import { Module } from '@nestjs/common';
import { CreatorAuthModule } from '../auth/creator-auth.module';
import { CreatorImageUploadController } from './controllers/creator-image-upload.controller';
import { CreatorJsonUploadsController } from './controllers/creator-json-uploads.controller';
import { CreatorImageStorage } from './interfaces/creator-image-storage.interface';
import { CreatorJsonStorage } from './interfaces/creator-json-storage.interface';
import { CreatorImageUploadService } from './services/creator-image-upload.service';
import { CreatorLocalImageCleanupService } from './services/creator-local-image-cleanup.service';
import { LocalCreatorImageStorage } from './services/local-creator-image-storage.service';
import { LocalCreatorJsonStorage } from './services/local-creator-json-storage.service';
import { CreatorOssStsService } from './services/creator-oss-sts.service';

@Module({
  imports: [CreatorAuthModule],
  controllers: [CreatorImageUploadController, CreatorJsonUploadsController],
  providers: [
    CreatorOssStsService,
    CreatorImageUploadService,
    CreatorLocalImageCleanupService,
    LocalCreatorImageStorage,
    LocalCreatorJsonStorage,
    { provide: CreatorImageStorage, useExisting: LocalCreatorImageStorage },
    { provide: CreatorJsonStorage, useExisting: LocalCreatorJsonStorage },
  ],
  exports: [CreatorOssStsService, CreatorImageUploadService, CreatorImageStorage, CreatorJsonStorage],
})
export class CreatorStorageModule {}
