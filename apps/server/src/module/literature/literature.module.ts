import { Global, Module } from '@nestjs/common';
import { UploadModule } from 'src/module/upload/upload.module';
import { ManuscriptController } from './manuscript/manuscript.controller';
import { ManuscriptService } from './manuscript/manuscript.service';
import { ManuscriptRepository } from './manuscript/manuscript.repository';
import { MaterialController } from './material/material.controller';
import { MaterialService } from './material/material.service';
import { MaterialRepository } from './material/material.repository';
import { TagController } from './tag/tag.controller';
import { TagService } from './tag/tag.service';
import { TagRepository } from './tag/tag.repository';
import { SettingController } from './setting/setting.controller';
import { SettingService } from './setting/setting.service';
import { SettingRepository } from './setting/setting.repository';
import { WorkbenchController } from './workbench/workbench.controller';
import { WorkbenchService } from './workbench/workbench.service';
import { LiteratureUploadController } from './upload/upload.controller';
import { LiteratureUploadService } from './upload/upload.service';
import { PrismaModule } from 'src/infrastructure/prisma';

@Global()
@Module({
  imports: [UploadModule, PrismaModule],
  controllers: [
    ManuscriptController,
    MaterialController,
    TagController,
    SettingController,
    WorkbenchController,
    LiteratureUploadController,
  ],
  providers: [
    ManuscriptService,
    ManuscriptRepository,
    MaterialService,
    MaterialRepository,
    TagService,
    TagRepository,
    SettingService,
    SettingRepository,
    WorkbenchService,
    LiteratureUploadService,
  ],
  exports: [ManuscriptService, MaterialService, TagService, SettingService, WorkbenchService],
})
export class LiteratureModule {}
