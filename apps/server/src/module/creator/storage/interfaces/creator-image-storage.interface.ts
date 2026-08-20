export interface CreatorStoredImage {
  fileId: string;
  url: string;
  originalName: string;
  contentType: string;
  size: number;
  expiresAt: number;
}

export abstract class CreatorImageStorage {
  abstract store(creatorId: string, file: Express.Multer.File, now?: Date): Promise<CreatorStoredImage>;
}
