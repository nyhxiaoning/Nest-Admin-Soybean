import { Module } from '@nestjs/common';
import { CreatorAuthModule } from './auth/creator-auth.module';
import { CreatorWorksModule } from './works/creator-works.module';

/** PC Creator Center 业务域入口模块。 */
@Module({
  imports: [CreatorAuthModule, CreatorWorksModule],
})
export class CreatorModule {}
