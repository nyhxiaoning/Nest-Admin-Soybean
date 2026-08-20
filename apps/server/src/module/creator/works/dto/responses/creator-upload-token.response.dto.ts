export interface CreatorUploadTokenResponseDto {
  endpoint: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  accessKeySecret: string;
  expiration: string;
  token: string;
  requestId?: string;
  path: string;
  fullPath: string;
}
