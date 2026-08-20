import { Injectable, Logger } from '@nestjs/common';
import { Config } from '@alicloud/openapi-client';
import Sts20150401, { AssumeRoleRequest } from '@alicloud/sts20150401';
import { AppConfigService } from 'src/config/app-config.service';
import { CreatorStorageConfig } from 'src/config/types';
import { BusinessException } from 'src/shared/exceptions';
import { ResponseCode } from 'src/shared/response';
import {
  AssumeCreatorUploadRoleInput,
  CreatorUploadCredential,
} from '../interfaces/creator-upload-credential.interface';

@Injectable()
export class CreatorOssStsService {
  private readonly logger = new Logger(CreatorOssStsService.name);

  constructor(private readonly configService: AppConfigService) {}

  async assumeUploadRole(input: AssumeCreatorUploadRoleInput): Promise<CreatorUploadCredential> {
    const config = this.configService.creatorStorage;
    this.assertConfigured(config);

    const clientConfig = new Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.stsEndpoint,
    });
    const client = new Sts20150401(clientConfig);
    const policy = JSON.stringify({
      Version: '1',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['oss:PutObject'],
          Resource: [`acs:oss:*:*:${config.bucket}/${input.objectPrefix}/*`],
        },
      ],
    });
    const roleSessionName = `creator-${input.creatorId.replaceAll('-', '').slice(0, 12)}`;

    try {
      const response = await client.assumeRole(
        new AssumeRoleRequest({
          durationSeconds: config.stsDurationSeconds,
          roleArn: config.roleArn,
          roleSessionName,
          policy,
        }),
      );
      const credentials = response.body?.credentials;
      if (
        !credentials?.accessKeyId ||
        !credentials.accessKeySecret ||
        !credentials.securityToken ||
        !credentials.expiration
      ) {
        throw new Error('STS response did not contain complete credentials');
      }
      return {
        endpoint: config.endpoint,
        region: config.region,
        bucketName: config.bucket,
        accessKeyId: credentials.accessKeyId,
        accessKeySecret: credentials.accessKeySecret,
        expiration: credentials.expiration,
        token: credentials.securityToken,
        requestId: response.body?.requestId,
        publicBaseUrl: config.publicBaseUrl,
      };
    } catch (error) {
      this.logger.error(`Creator OSS STS AssumeRole failed for creator ${input.creatorId}`);
      if (error instanceof BusinessException) throw error;
      throw new BusinessException(ResponseCode.EXTERNAL_SERVICE_ERROR, '获取上传凭证失败，请稍后重试');
    }
  }

  private assertConfigured(config: CreatorStorageConfig): void {
    const ready =
      config.enabled &&
      config.accessKeyId &&
      config.accessKeySecret &&
      config.roleArn &&
      config.region &&
      config.bucket &&
      config.endpoint &&
      config.publicBaseUrl;
    BusinessException.throwIf(!ready, 'Creator OSS STS 尚未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);
  }
}
