import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from 'src/config/app-config.service';
import { CreatorJwtGuard } from '../common';
import { CreatorAuthController } from './controllers/creator-auth.controller';
import { CreatorAuthService } from './services/creator-auth.service';

/** PC Creator Center 独立认证模块。 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({ secret: config.jwt.secretkey }),
    }),
  ],
  controllers: [CreatorAuthController],
  providers: [CreatorAuthService, CreatorJwtGuard],
  exports: [JwtModule, CreatorAuthService, CreatorJwtGuard],
})
export class CreatorAuthModule {}
