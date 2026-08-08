import { Injectable } from '@nestjs/common';
import { Result } from 'src/shared/response';
import { SettingRepository } from './setting.repository';
import { UpdateSettingRequestDto } from './dto/requests';
import { SettingResponseDto } from './dto/responses';
import { toDto } from 'src/shared/utils/serialize.util';

@Injectable()
export class SettingService {
  constructor(private readonly settingRepo: SettingRepository) {}

  /**
   * 获取当前用户的设置（首次访问自动创建默认值）
   */
  async get(userId: number) {
    let setting = await this.settingRepo.findByUserId(userId);
    if (!setting) {
      setting = await this.settingRepo.createDefault(userId);
    }
    return Result.ok(toDto(SettingResponseDto, setting));
  }

  /**
   * 更新设置（upsert）
   */
  async update(updateDto: UpdateSettingRequestDto, userId: number) {
    let setting = await this.settingRepo.findByUserId(userId);
    if (!setting) {
      setting = await this.settingRepo.createDefault(userId);
    }

    const data = await this.settingRepo.update(setting.settingId, {
      fontSize: updateDto.fontSize,
      fontFamily: updateDto.fontFamily,
      autosave: updateDto.autosave,
      autosaveInterval: updateDto.autosaveInterval,
      exportFormat: updateDto.exportFormat,
      updateBy: String(userId),
    });

    return Result.ok(toDto(SettingResponseDto, data));
  }
}
