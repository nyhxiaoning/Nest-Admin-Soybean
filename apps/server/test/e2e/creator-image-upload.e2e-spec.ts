import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CreatorJwtGuard } from 'src/module/creator/common';
import { CreatorImageUploadController } from 'src/module/creator/storage/controllers/creator-image-upload.controller';
import { CreatorImageUploadService } from 'src/module/creator/storage/services/creator-image-upload.service';

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

describe('Creator image upload API', () => {
  let app: INestApplication;
  const uploadService = {
    upload: jest.fn().mockResolvedValue({
      fileId: 'd2b5556b-8718-41ca-bab7-a2978993415e',
      url: 'http://localhost:8080/profile/creator/id/images/2026/08/20/file.png',
      originalName: 'image.png',
      contentType: 'image/png',
      size: 4,
      expiresAt: 1787810400000,
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CreatorImageUploadController],
      providers: [{ provide: CreatorImageUploadService, useValue: uploadService }],
    })
      .overrideGuard(CreatorJwtGuard)
      .useClass(TestCreatorGuard)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('uploads a multipart image for the authenticated Creator', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/creator/uploads/images')
      .attach('file', Buffer.from([1, 2, 3, 4]), { filename: 'image.png', contentType: 'image/png' })
      .expect(200);

    expect(response.body).toMatchObject({
      code: 200,
      data: {
        fileId: 'd2b5556b-8718-41ca-bab7-a2978993415e',
        contentType: 'image/png',
        size: 4,
      },
    });
    expect(uploadService.upload).toHaveBeenCalledWith(
      expect.objectContaining({ id: '34f70fa8-f95f-4f17-b245-09c3814fbff1' }),
      expect.objectContaining({ originalname: 'image.png', mimetype: 'image/png', size: 4 }),
    );
  });
});
