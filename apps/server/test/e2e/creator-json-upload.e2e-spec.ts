import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CreatorJwtGuard } from 'src/module/creator/common';
import { CreatorJsonUploadsController } from 'src/module/creator/storage/controllers/creator-json-uploads.controller';
import { CreatorJsonStorage } from 'src/module/creator/storage/interfaces/creator-json-storage.interface';

const CREATOR_ID = '34f70fa8-f95f-4f17-b245-09c3814fbff1';
let allowAccess = true;

class TestCreatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!allowAccess) return false;
    context.switchToHttp().getRequest().creatorUser = {
      id: CREATOR_ID,
      phone: '13800000000',
      name: 'Creator',
      sessionUuid: 'session-id',
      subjectType: 'pc-creator-center',
    };
    return true;
  }
}

describe('Creator JSON Upload API', () => {
  let app: INestApplication;
  const storage = {
    store: jest.fn().mockResolvedValue({
      fileId: 'd239f441-5eb8-4b91-9bf8-bc1c4f67c270',
      url: 'http://localhost:8080/profile/creator/example.json',
      contentType: 'application/json',
      size: 23,
      expiresAt: 1787810400000,
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CreatorJsonUploadsController],
      providers: [{ provide: CreatorJsonStorage, useValue: storage }],
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

  afterEach(() => {
    allowAccess = true;
    jest.clearAllMocks();
  });

  it('stores JSON for the authenticated Creator and returns its public URL', async () => {
    const content = { version: 1, layers: [{ id: 'layer-1' }] };

    const response = await request(app.getHttpServer()).post('/api/creator/uploads/json').send(content).expect(200);

    expect(response.body).toMatchObject({
      code: 200,
      data: {
        fileId: 'd239f441-5eb8-4b91-9bf8-bc1c4f67c270',
        url: 'http://localhost:8080/profile/creator/example.json',
        contentType: 'application/json',
        size: 23,
        expiresAt: 1787810400000,
      },
    });
    expect(storage.store).toHaveBeenCalledWith(CREATOR_ID, content);
  });

  it('rejects a request without an authenticated Creator session', async () => {
    allowAccess = false;

    await request(app.getHttpServer()).post('/api/creator/uploads/json').send({ version: 1 }).expect(403);

    expect(storage.store).not.toHaveBeenCalled();
  });
});
