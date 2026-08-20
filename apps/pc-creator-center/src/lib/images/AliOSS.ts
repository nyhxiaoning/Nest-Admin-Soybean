import OSS from 'ali-oss';
// 获取不同方式获取上传token：

import { getUploadTokenApi } from '@/api/works';

export const createOssClient = async (
  type: string | number,
  fileName?: string,
  fileSize?: number,
  fileType?: string,
) => {
  try {
    const role = normalizeUploadRole(type);
    const response = await getUploadTokenApi({ role, fileName, fileSize, fileType });
    // console.log('获取oss配置成功', response);
    return {
      client: new OSS({
        region: response.result.region,
        endpoint: response.result.endpoint,
        authorizationV4: true,
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
    throw err instanceof Error ? err : new Error(String(err));
  }
};

function normalizeUploadRole(type: string | number): 'COVER_IMAGE' | 'GIF_FILE' | 'EDITABLE_JSON' | 'STATIC_BIN' {
  if (type === 'GIF_FILE' || type === 8) return 'GIF_FILE';
  if (type === 'EDITABLE_JSON' || type === 9) return 'EDITABLE_JSON';
  if (type === 'STATIC_BIN' || type === 6) return 'STATIC_BIN';
  return 'COVER_IMAGE';
}
