import OSS from 'ali-oss';
// 获取不同方式获取上传token：

import { getUploadTokenApi } from '@/api/works';

export const createOssClient = async (type: string) => {
  try {
    const response = await getUploadTokenApi(type);
    // console.log('获取oss配置成功', response);
    return {
      client: new OSS({
        region: response.result.region,
        accessKeyId: response.result.accessKeyId,
        accessKeySecret: response.result.accessKeySecret,
        stsToken: response.result.token,
        bucket: response.result.bucketName,
      }),
      path: response.result.path,
      fullPath: response.result.fullPath,
    };
  } catch (err) {
    console.error('获取oss配置失败', err);
    throw new Error(err);
  }
};
