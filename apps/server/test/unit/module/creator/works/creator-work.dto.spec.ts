import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatorUploadTokenRequestDto } from 'src/module/creator/works/dto/requests/creator-upload-token.request.dto';
import { CreatorWorkSaveRequestDto } from 'src/module/creator/works/dto/requests/creator-work-save.request.dto';

describe('Creator works DTO validation', () => {
  it('rejects a title containing only whitespace', async () => {
    const dto = plainToInstance(CreatorWorkSaveRequestDto, { title: '   ' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'title')).toBe(true);
  });

  it('rejects an unsupported upload role', async () => {
    const dto = plainToInstance(CreatorUploadTokenRequestDto, { role: 'VIDEO' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'role')).toBe(true);
  });

  it('rejects a file larger than the largest supported upload role limit', async () => {
    const dto = plainToInstance(CreatorUploadTokenRequestDto, {
      role: 'COVER_IMAGE',
      fileName: 'cover.png',
      fileSize: 51 * 1024 * 1024,
      fileType: 'image/png',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'fileSize')).toBe(true);
  });
});
