export interface CreatorUploadCredential {
  endpoint: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  accessKeySecret: string;
  expiration: string;
  token: string;
  requestId?: string;
  publicBaseUrl: string;
}

export interface AssumeCreatorUploadRoleInput {
  creatorId: string;
  objectPrefix: string;
}
