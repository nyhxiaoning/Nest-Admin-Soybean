import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatorStorageConfig {
  @IsInt()
  @Min(1)
  @Max(365)
  localImageTtlDays: number;

  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsOptional()
  accessKeyId: string;

  @IsString()
  @IsOptional()
  accessKeySecret: string;

  @IsString()
  @IsOptional()
  roleArn: string;

  @IsString()
  @IsOptional()
  region: string;

  @IsString()
  @IsOptional()
  bucket: string;

  @IsString()
  @IsOptional()
  endpoint: string;

  @IsString()
  @IsOptional()
  stsEndpoint: string;

  @IsString()
  @IsOptional()
  publicBaseUrl: string;

  @IsInt()
  @Min(900)
  @Max(3600)
  stsDurationSeconds: number;
}
