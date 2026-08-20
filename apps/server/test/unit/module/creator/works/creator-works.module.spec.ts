import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppConfigService } from 'src/config/app-config.service';
import { PrismaService } from 'src/infrastructure/prisma';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CreatorWorksModule } from 'src/module/creator/works/creator-works.module';

@Global()
@Module({
  providers: [
    {
      provide: AppConfigService,
      useValue: {
        jwt: { secretkey: 'creator-works-module-test-secret' },
        creatorStorage: {},
      },
    },
    { provide: RedisService, useValue: {} },
    { provide: PrismaService, useValue: {} },
  ],
  exports: [AppConfigService, RedisService, PrismaService],
})
class CreatorWorksTestDependenciesModule {}

describe('CreatorWorksModule', () => {
  it('resolves CreatorJwtGuard and its JwtService dependency', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CreatorWorksTestDependenciesModule, CreatorWorksModule],
    }).compile();

    await moduleRef.close();
  });
});
