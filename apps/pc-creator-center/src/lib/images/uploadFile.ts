import {
  binFileName,
  defaultGifName,
  defaultImageSize,
  doodleImgFileName,
  doodleJsonFileName,
} from './Common.ts';
import {
  colorsToBlob,
  colorsToJsonBlob,
  compressImageTo64x16,
  convertHexArrayToPng,
  convertImageToRGB565,
  convertRgb565BlobToPng,
} from './rgb.ts';
import { WIDTH, HEIGHT } from '@/modules/pixel-editor/core/index'

import { createOssClient } from './AliOSS.ts';
import { ElMessage } from 'element-plus'


import { useAppI18n } from '@@/composables/useI18n'

// 文件名清理函数
const sanitizeFileName = (fileName: string): string => {
  // 移除扩展名
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '')
  // 移除所有特殊字符（括号、空格、特殊符号等），只保留字母、数字、中文、下划线、连字符
  return nameWithoutExt.replace(/[^a-zA-Z0-9一-龥_-]/g, '')
}

// 上传图片的逻辑
export enum UploadFileEnum {
  IMAGE = 7, //图片 封面图 COVER_IMAGE
  GIF = 'GIF_FILE', //GIF GIF_FILE
  EDITABLE_JSON = 9,// EDITABLE_JSON 编辑json
  STATIC_BIN = 6, //STATIC_BIN 静态图
  BIN = 6, // 兼容旧的二进制文件调用

  OTHER = 10, //其他文件
  BASE64IMG = 11, //BASE64图片，这里使用7和12是一个BASE

}

// export enum UploadFileEnum {
//     IMAGE = 7, //图片
//     GIF = 8, //GIF
//     BIN = 9, //二进制文件
//     OTHER = 10, //其他文件
//     BASE64IMG = 11, //BASE64图片
// }

export interface AddArtifactParam {
  //作品ID，新增时可以不传，修改时必传
  uuid?: string;

  fileUrl: string;
  //源文件大小
  fileSize: number;
  //二进制文件地址
  binFileUrl?: string;
  //二进制文件大小
  binSize?: number;
  //作品类型 0:静态图 1:动图 2:涂鸦
  type: number;
  //封面
  cover: string;
  // 标签
  // projectTag?: string; // 是否是涂鸦查询，还是其他是 PixelArt 或 Unfold
}


export const uploadImage = (file: File): Promise<any> => {
  // alert('uploadImage');

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // const { t } = useAppI18n()
      // 判断一下，file.type
      let fileType = '';
      console.log('file.type', file.type)
      console.log(file.type === 'image/jpeg',)

      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        // alert('file')
        fileType = "STATIC_BIN"
      }

      const safeName = sanitizeFileName(file.name)
      const uploadImgRes = await uploadFile(file, safeName, fileType);

      console.log(uploadImgRes, 'uploadImgResuploadImgRes')
      const imgBlob = await convertImageToRGB565(file, UploadFileEnum.IMAGE);
      const uploadBinRes = await uploadFile(imgBlob, binFileName, fileType);
      const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      const pngFileUpload = await uploadFile(pngDefailt, safeName, fileType);
      resolve({
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
        binFileUrl: uploadBinRes.fileUrl,
        binSize: uploadBinRes.fileSize,
        cover: pngFileUpload.fileUrl,
        // type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};



export const uploadStaticImgCover = (file: File): Promise<any> => {
  // alert('uploadImage');

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // const { t } = useAppI18n()
      // 判断一下，file.type
      alert(file.type)
      const uploadImgRes = await uploadFile(file, sanitizeFileName(file.name), 'COVER_IMAGE');
      console.log(uploadImgRes, 'uploadImgResuploadImgRes')
      // const imgBlob = await convertImageToRGB565(file, UploadFileEnum.IMAGE);
      // const uploadBinRes = await uploadFile(imgBlob, binFileName, UploadFileEnum.BIN);
      // const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      // const pngFileUpload = await uploadFile(pngDefailt, file.name, UploadFileEnum.IMAGE);
      resolve({
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
        // binFileUrl: uploadBinRes.fileUrl,
        // binSize: uploadBinRes.fileSize,
        // cover: pngFileUpload.fileUrl,
        type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};



export const uploadPixelJSON = (data: any): Promise<any> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // 生成安全文件名（不包含时间戳，避免重复）
      const projectName = data?.name || 'untitled';
      const safeFileName = `${projectName.replace(/[^a-zA-Z0-9一-龥_-]/g, '_')}.json`;

      const uploadRes = await uploadeditorJson(JSON.stringify(data), safeFileName, 'EDITABLE_JSON');
      console.log('uploadPixelJSON success:', uploadRes)

      resolve({
        originData: data,
        fileUrl: uploadRes.fileUrl,
        fileSize: uploadRes.fileSize,
      });
    } catch (error) {
      console.error('uploadPixelJSON failed:', error);
      reject(error);
    }
  });
};


export const uploadGifCover = (file: File): Promise<any> => {
  // alert('uploadImage');

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // const { t } = useAppI18n()
      // 判断一下，file.type
      alert(file.type)
      const uploadImgRes = await uploadFile(file, sanitizeFileName(file.name), 'COVER_IMAGE');
      console.log(uploadImgRes, 'uploadImgResuploadImgRes')
      // const imgBlob = await convertImageToRGB565(file, UploadFileEnum.IMAGE);
      // const uploadBinRes = await uploadFile(imgBlob, binFileName, UploadFileEnum.BIN);
      // const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      // const pngFileUpload = await uploadFile(pngDefailt, file.name, UploadFileEnum.IMAGE);
      resolve({
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
        // binFileUrl: uploadBinRes.fileUrl,
        // binSize: uploadBinRes.fileSize,
        // cover: pngFileUpload.fileUrl,
        type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const uploadBase64Image = (file: string): Promise<AddArtifactParam> => {
  // alert('uploadBase64Image');
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const uploadBase64String = await compressImageTo64x16(file);
      const imgBlob = await convertImageToRGB565(uploadBase64String, UploadFileEnum.BASE64IMG);
      const uploadBinRes = await uploadFile(imgBlob, binFileName, UploadFileEnum.BIN);
      const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      const pngFileUpload = await uploadFile(pngDefailt, doodleImgFileName, UploadFileEnum.IMAGE);
      resolve({
        fileUrl: pngFileUpload.fileUrl,
        fileSize: pngFileUpload.fileSize,
        binFileUrl: uploadBinRes.fileUrl,
        binSize: uploadBinRes.fileSize,
        cover: pngFileUpload.fileUrl,
        type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};
const uploadFile = (file: any, name: string, uploadType: string | number): Promise<FileResponse> => {

  // alert('uploadFile');
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // 配置当前的类型：
      const ossConfig = await createOssClient(uploadType, name, file?.size, file?.type);
      const fileName = ossConfig.path + '/' + name;
      await ossConfig.client.put(fileName, file, {});
      resolve({
        fileUrl: ossConfig.fullPath + '/' + name,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('上传失败:', err);
      reject(err);
    }
  });
};



const uploadeditorJson = (data: any, name: string, uploadType: string | number): Promise<FileResponse> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // 配置当前的类型：
      const ossConfig = await createOssClient(uploadType, name, undefined, 'application/json');

      // 确保文件名以 .json 结尾
      let safeFileName = name;
      if (!safeFileName.endsWith('.json')) {
        safeFileName = `${safeFileName}.json`;
      }

      // 将数据转换为 Blob
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      const jsonBlob = new Blob([jsonString], { type: 'application/json' });

      // 生成文件名
      const fileName = `${ossConfig.path}/${safeFileName}`;

      // 执行实际上传
      await ossConfig.client.put(fileName, jsonBlob, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      resolve({
        fileUrl: `${ossConfig.fullPath}/${safeFileName}`,
        fileSize: jsonBlob.size,
      });
    } catch (err) {
      console.error('上传编辑器JSON失败:', err);
      reject(err);
    }
  });
};

export const uploadStaticImage = (file: File): Promise<AddArtifactParam> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: 上传原始图片作为封面
      const coverUploadRes = await uploadFile(file, sanitizeFileName(file.name), 'COVER_IMAGE')

      // Step 2: 转换为 RGB565 二进制数据
      const rgb565Blob = await convertImageToRGB565(file, UploadFileEnum.STATIC_BIN)
      const binUploadRes = await uploadFile(rgb565Blob, binFileName, 'STATIC_BIN')

      // Step 3: 转换为 PNG 预览图
      const pngBlob = await convertRgb565BlobToPng(rgb565Blob, defaultImageSize.width, defaultImageSize.height)
      const pngUploadRes = await uploadFile(pngBlob, sanitizeFileName(file.name), 'STATIC_BIN')

      resolve({
        fileUrl: coverUploadRes.fileUrl,
        fileSize: coverUploadRes.fileSize,
        binFileUrl: binUploadRes.fileUrl,
        binSize: binUploadRes.fileSize,
        cover: pngUploadRes.fileUrl,
        type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const uploadStaticImageWithJson = async (
  file: File,
  projectData: object
): Promise<{
  coverUrl: string
  binFileUrl: string
  binFileSize: number
  editableFileUrl: string
}> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: 上传原始图片作为封面
      await uploadFile(file, sanitizeFileName(file.name), 'COVER_IMAGE')

      // Step 2: 转换为 RGB565 二进制数据
      const rgb565Blob = await convertImageToRGB565(file, UploadFileEnum.STATIC_BIN)
      const binUploadRes = await uploadFile(rgb565Blob, binFileName, 'STATIC_BIN')

      // Step 3: 转换为 PNG 预览图
      const pngBlob = await convertRgb565BlobToPng(rgb565Blob, defaultImageSize.width, defaultImageSize.height)
      const pngUploadRes = await uploadFile(pngBlob, sanitizeFileName(file.name), 'STATIC_BIN')

      // Step 4: 校验项目数据中的像素数据
      const frames = (projectData as any)?.frames || []
      if (frames.length > 0) {
        const firstLayerPixels = frames[0]?.layers?.[0]?.pixels
        if (Array.isArray(firstLayerPixels)) {
          const nullCount = firstLayerPixels.filter(p => p == null).length
          console.log('[uploadStaticImageWithJson] 像素数据校验:', {
            total: firstLayerPixels.length,
            nullCount,
            colorCount: firstLayerPixels.length - nullCount,
            sample: firstLayerPixels.slice(0, 5),
          })
        } else {
          console.warn('[uploadStaticImageWithJson] 警告: 未检测到像素数据，frames[0].layers[0].pixels 不存在或不是数组')
        }
      }

      // Step 5: 上传项目 JSON 数据
      const jsonUploadRes = await uploadPixelJSON(projectData)

      resolve({
        coverUrl: pngUploadRes.fileUrl,
        binFileUrl: binUploadRes.fileUrl,
        binFileSize: binUploadRes.fileSize,
        editableFileUrl: jsonUploadRes.fileUrl,
      });
    } catch (error) {
      console.error('[uploadStaticImageWithJson] 上传失败:', error)
      reject(error);
    }
  });
};

export const uploadDoodle = (colors: Array<string | null>): Promise<any> => {
  // alert('uploadDoodle');
  // const { t } = useAppI18n()
  console.log('上传涂鸦colors is', colors[0]);
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // 将 null 像素替换为默认颜色，避免下游转换出错
      const filledColors = colors.map((c) => c || '#CACACA')
      const jsonBlob = colorsToJsonBlob(filledColors);
      const jsonFileUpload = await uploadFile(jsonBlob, doodleJsonFileName, 'STATIC_BIN');
      const doodleImgBlob = await convertHexArrayToPng(filledColors, defaultImageSize.width, defaultImageSize.height);
      const pngFileUpload = await uploadFile(doodleImgBlob, doodleImgFileName, 'STATIC_BIN');
      const colorBlob = colorsToBlob(filledColors);
      const binFileUpload = await uploadFile(colorBlob, binFileName, 'STATIC_BIN');

      resolve({
        fileUrl: jsonFileUpload.fileUrl,
        fileSize: jsonFileUpload.fileSize,
        binFileUrl: binFileUpload.fileUrl,
        binSize: binFileUpload.fileSize,
        cover: pngFileUpload.fileUrl
        // type: AllowedArtifactTypes.DOODLE,
      });
    } catch (err) {
      console.error('上传涂鸦失败:', err);
      reject(err);
    }
  });
};

export const uploadGif = (file: Blob | File): Promise<AddArtifactParam> => {
  // const { t } = useAppI18n()
  return new Promise((resolve, reject) => {
    uploadFile(file, defaultGifName, UploadFileEnum.GIF)
      .then((gifResponse) => {
        resolve({
          fileUrl: gifResponse.fileUrl,
          fileSize: gifResponse.fileSize,
          cover: gifResponse.fileUrl,
          type: AllowedArtifactTypes.GIF,
        });
      })
      .catch((err) => {
        console.error('上传图片到oss失败:', err);
        reject(err);
      });
  });
};

/**
 * 上传 GIF 并包含所有帧的像素数据
 * @param file GIF 文件
 * @param framesData 所有帧的数据（包含 layers）
 * @returns 上传结果
 */
export const uploadGifWithFrames = async (
  file: File,
  framesData: Array<{
    id?: string
    delay: number
    viewportX: number
    viewportY: number
    layers: Array<{
      id?: string
      name: string
      visible: boolean
      opacity: number
      pixels: (string | null)[]
      canvasPixels?: Record<string, string>
    }>
  }>
): Promise<AddArtifactParam> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: 上传 GIF 文件
      const gifUploadRes = await uploadFile(file, sanitizeFileName(file.name), UploadFileEnum.GIF)

      // Step 2: 创建项目数据（包含所有帧）
      const projectData = {
        version: 4,
        name: file.name,
        width: WIDTH,
        height: HEIGHT,
        currentFrameIndex: 0,
        activeLayer: 0,
        frames: framesData.map((frame) => ({
          ...frame,
          layers: (frame.layers || []).map((layer) => ({
            ...layer,
            canvasPixels: undefined, // 移除 canvasPixels 以减小文件大小
          })),
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Step 3: 上传 JSON 数据
      const jsonUploadRes = await uploadPixelJSON(projectData)

      resolve({
        fileUrl: gifUploadRes.fileUrl,
        fileSize: gifUploadRes.fileSize,
        binFileUrl: jsonUploadRes.fileUrl, // 用 JSON URL 作为 binFileUrl
        binSize: jsonUploadRes.fileSize,
        cover: gifUploadRes.fileUrl,
        type: AllowedArtifactTypes.GIF,
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const checkFile = async (file: any, t: any) => {
  // alert('checkFile');
  // let { t } = useAppI18n()
  console.log('checkFilekkkk');
  const fileType = file.type;
  if (fileType === 'image/jpeg' || fileType === 'image/png') {
    if (checkFileSize(file, AllowedArtifactTypes.IMAGE, t)) {
      ElMessage.error(t('common.imgSizeError'))

      throw new Error(t('common.imgSizeError'));
    }
    await getImageDimensions(file);
    // const ratio = img.width / img.height;
    // if (Math.abs(ratio - 4) > 0.01) {
    //   ElMessage.error(t('common.imgSpecsError'))

    //   throw new Error(t('common.imgSpecsError'));
    // }
    return Promise.resolve();
  } else if (fileType === 'image/gif') {
    if (checkFileSize(file, AllowedArtifactTypes.GIF, t)) {
      ElMessage.error(t('common.gifSizeError'))
      throw new Error(t('common.gifSizeError'));

    }
    return true;
    // return isGifSizeValid(file).then((resut) => {
    //   if (resut) {
    //     ElMessage.error(t('common.gifSpecsError'))
    //     throw new Error(t('common.gifSpecsError'));
    //   }
    // });
  } else {
    ElMessage.error(t('common.fileTypeError'))
    throw new Error(t('common.fileTypeError'));
  }
};

export const uploadUserFile = (file: any, fileType: UploadFileEnum): Promise<FileResponse> => {
  const { t } = useAppI18n()
  return new Promise((resolve, reject) => {
    // alert('uploadUserFile');
    if (fileType === UploadFileEnum.BASE64IMG) {
      resolve(uploadBase64Image(file));
    } else {
      const fileType = file.type;
      if (fileType === 'image/jpeg' || fileType === 'image/png') {
        if (checkFileSize(file, AllowedArtifactTypes.IMAGE, t)) {
          reject(new Error(t('common.imgSizeError')));
        }
        getImageDimensions(file)
          .then((img) => {
            const ratio = img.width / img.height;
            if (Math.abs(ratio - 4) > 0.01) {
              reject(new Error(t('common.imgSpecsError')));
              return;
            }
            resolve(uploadImage(file));
          })
          .catch(() => {
            reject(new Error(t('common.imgSpecsError')));
          });
      } else if (fileType === 'image/gif') {
        if (checkFileSize(file, AllowedArtifactTypes.GIF, t)) {
          reject(new Error(t('common.gifSizeError')));
        }
        isGifSizeValid(file)
          .then((resut) => {
            if (resut) {
              reject(new Error(t('common.gifSpecsError')));
            }
            resolve(uploadGif(file));
          })
          .catch(() => {
            reject(new Error(t('common.gifSpecsError')));
          });
      } else {
        throw new Error(t('common.fileTypeError'));
      }
    }
  });
};

export const uploadMutFile = (file: File): Promise<FileResponse> => {
  const { t } = useAppI18n()
  return new Promise((resolve, reject) => {
    const fileType = file.type;
    if (fileType === 'image/jpeg' || fileType === 'image/png') {
      if (checkFileSize(file, AllowedArtifactTypes.IMAGE, t)) {
        reject(new Error(t('common.imgSizeError')));
      }
      resolve(uploadImage(file));
    } else if (fileType === 'image/gif') {
      if (checkFileSize(file, AllowedArtifactTypes.GIF, t)) {
        reject(new Error(t('common.gifSizeError')));
      }
      isGifSizeValid(file)
        .then((resut) => {
          if (resut) {
            reject(new Error(t('common.gifSpecsError')));
          }
          resolve(uploadGif(file));
        })
        .catch(() => {
          reject(new Error(t('common.gifSpecsError')));
        });
    } else {
      throw new Error(t('common.fileTypeError'));
    }
  });
};

const checkFileSize = (file: File, type: AllowedArtifactTypes, t: any) => {

  switch (type) {
    // unfold特殊处理：50KB，宽高比：4:1
    case AllowedArtifactTypes.IMAGE:
      return file.size > 50 * 1024 * 1024;
    case AllowedArtifactTypes.GIF:
      return file.size > 50 * 1024;
    default:
      throw new Error(t('common.fileTypeError'));
  }
};
const isGifSizeValid = async (file: File) => {
  const gif = await getImageDimensions(file);
  return !(gif.width === defaultImageSize.width && gif.height === defaultImageSize.height);
};
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};


export interface GetOssTokenParam {
  //作品类型 0:静态图 1:动图 2:涂鸦
  type: number;
}



export enum AllowedArtifactTypes {
  IMAGE = 0, //图片
  GIF = 1, //GIF
  DOODLE = 2, //GIF
}

export interface FileResponse {
  fileUrl: string;
  fileSize: number;
}

export interface UploadImageResponse {
  fileUrl: string;
  fileSize: number;
  binFileUrl: string;
  binSize: number;
}
