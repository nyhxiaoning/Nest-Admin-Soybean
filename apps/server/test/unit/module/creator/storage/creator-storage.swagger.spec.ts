import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CreatorJwtGuard } from 'src/module/creator/common';
import { CreatorImageUploadController } from 'src/module/creator/storage/controllers/creator-image-upload.controller';
import { CreatorJsonUploadsController } from 'src/module/creator/storage/controllers/creator-json-uploads.controller';
import { CreatorJsonStorage } from 'src/module/creator/storage/interfaces/creator-json-storage.interface';
import { CreatorImageUploadService } from 'src/module/creator/storage/services/creator-image-upload.service';

describe('Creator storage Swagger document', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CreatorImageUploadController, CreatorJsonUploadsController],
      providers: [
        { provide: CreatorImageUploadService, useValue: { upload: jest.fn() } },
        { provide: CreatorJsonStorage, useValue: { store: jest.fn() } },
      ],
    })
      .overrideGuard(CreatorJwtGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ['/creator/uploads/images', 'multipart/form-data'],
    ['/creator/uploads/json', 'application/json'],
  ])('documents request, bearer security, and typed response for %s', (path, contentType) => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const operation = document.paths[path]?.post as any;

    expect(operation.tags).toContain('PC Creator Center - 暂存上传');
    expect(operation.security).toEqual(expect.arrayContaining([expect.objectContaining({ Authorization: [] })]));
    expect(operation.requestBody.content[contentType]).toBeDefined();
    expect(operation.responses['200'].content['application/json'].schema.allOf).toEqual(expect.any(Array));
  });
});
