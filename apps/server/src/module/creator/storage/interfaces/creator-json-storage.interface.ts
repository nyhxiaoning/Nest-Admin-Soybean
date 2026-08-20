export interface CreatorStoredJson {
  fileId: string;
  url: string;
  contentType: 'application/json';
  size: number;
  expiresAt: number;
}

/**
 * Creator JSON storage boundary. Local disk and future OSS implementations must
 * preserve this contract so callers do not depend on the storage provider.
 */
export abstract class CreatorJsonStorage {
  abstract store(creatorId: string, content: unknown, now?: Date): Promise<CreatorStoredJson>;
}
