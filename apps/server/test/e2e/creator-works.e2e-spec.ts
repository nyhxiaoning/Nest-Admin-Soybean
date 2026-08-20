import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CreatorJwtGuard } from 'src/module/creator/common';
import { CreatorWorksController } from 'src/module/creator/works/controllers/creator-works.controller';
import { CreatorWorkReleaseService } from 'src/module/creator/works/services/creator-work-release.service';
import { CreatorWorkUploadService } from 'src/module/creator/works/services/creator-work-upload.service';
import { CreatorWorksService } from 'src/module/creator/works/services/creator-works.service';

class TestCreatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().creatorUser = {
      id: '34f70fa8-f95f-4f17-b245-09c3814fbff1',
      phone: '13800000000',
      name: 'Creator',
      sessionUuid: 'session-id',
      subjectType: 'pc-creator-center',
    };
    return true;
  }
}

describe('Creator Works API', () => {
  let app: INestApplication;
  const worksService = {
    create: jest.fn().mockResolvedValue('aa6eb6c8-0fb0-4b2a-91c3-037252dedde3'),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CreatorWorksController],
      providers: [
        { provide: CreatorWorksService, useValue: worksService },
        { provide: CreatorWorkReleaseService, useValue: {} },
        { provide: CreatorWorkUploadService, useValue: {} },
      ],
    })
      .overrideGuard(CreatorJwtGuard)
      .useClass(TestCreatorGuard)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates a work through the authenticated Creator API contract', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/creator/works')
      .send({ title: 'HTTP work', type: 'STATIC' })
      .expect(200);

    expect(response.body).toMatchObject({
      code: 200,
      data: 'aa6eb6c8-0fb0-4b2a-91c3-037252dedde3',
    });
    expect(worksService.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: '34f70fa8-f95f-4f17-b245-09c3814fbff1' }),
      expect.objectContaining({ title: 'HTTP work' }),
    );
  });
});
