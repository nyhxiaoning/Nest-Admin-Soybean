import { Module } from '@nestjs/common';
import { CreatorAuthModule } from './auth/creator-auth.module';

/** PC Creator Center 业务域入口模块。 */
@Module({
  imports: [CreatorAuthModule],
})
export class CreatorModule {}
