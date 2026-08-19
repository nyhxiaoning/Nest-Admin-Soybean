import { randomInt, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AppConfigService } from 'src/config/app-config.service';
import { PrismaService } from 'src/infrastructure/prisma';
import { RedisService } from 'src/module/common/redis/redis.service';
import { BusinessException } from 'src/shared/exceptions';
import { ResponseCode } from 'src/shared/response';
import {
  CREATOR_AUTH_LIMIT,
  CREATOR_AUTH_TTL,
  CREATOR_JWT_SUBJECT_TYPE,
  CREATOR_USER_ACTIVE_STATUS,
  creatorAuthRedisKey,
  CreatorLoginType,
  CreatorSession,
} from '../../common';
import { CreatorLoginRequestDto, SendCreatorCodeRequestDto, SetCreatorPasswordRequestDto } from '../dto';

interface StoredCreatorCode {
  code: string;
  attempts: number;
}

export interface CreatorLoginResult {
  token: string;
  id: string;
  name: string;
  phone: string;
  menuCodes: string[];
}

/** PC Creator Center 独立认证服务。 */
@Injectable()
export class CreatorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async sendCode(dto: SendCreatorCodeRequestDto): Promise<{ code?: string }> {
    const cooldownKey = creatorAuthRedisKey.codeCooldown(dto.phone);
    if (await this.redis.get(cooldownKey)) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '验证码发送过于频繁，请稍后再试');
    }

    const code = randomInt(0, 10_000).toString().padStart(4, '0');
    const storedCode: StoredCreatorCode = { code, attempts: 0 };

    await this.redis.set(creatorAuthRedisKey.code(dto.phone), storedCode, CREATOR_AUTH_TTL.code);
    await this.redis.set(cooldownKey, '1', CREATOR_AUTH_TTL.codeCooldown);

    return process.env.NODE_ENV === 'production' ? {} : { code };
  }

  async login(dto: CreatorLoginRequestDto): Promise<CreatorLoginResult> {
    const user =
      dto.loginType === CreatorLoginType.CODE
        ? await this.loginWithCode(dto.phone, dto.code)
        : await this.loginWithPassword(dto.phone, dto.password);

    if (user.status !== CREATOR_USER_ACTIVE_STATUS) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '创作者账号已停用');
    }

    await this.prisma.creatorUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createSession(user);
  }

  async setPassword(session: CreatorSession, dto: SetCreatorPasswordRequestDto): Promise<void> {
    const user = await this.prisma.creatorUser.findUnique({ where: { id: session.id } });
    if (!user || user.status !== CREATOR_USER_ACTIVE_STATUS) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '创作者账号不可用');
    }

    if (user.password) {
      const validCurrentPassword = Boolean(
        dto.currentPassword && (await bcrypt.compare(dto.currentPassword, user.password)),
      );
      if (!validCurrentPassword) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '当前密码错误');
      }
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.creatorUser.update({
      where: { id: session.id },
      data: { password },
    });
  }

  async logout(session: CreatorSession): Promise<void> {
    await this.redis.del(creatorAuthRedisKey.session(session.sessionUuid));
  }

  private async loginWithCode(phone: string, code?: string) {
    await this.verifyCode(phone, code);

    return this.prisma.creatorUser.upsert({
      where: { phone },
      create: {
        phone,
        name: `用户${phone.slice(-5)}`,
      },
      update: {},
    });
  }

  private async loginWithPassword(phone: string, password?: string) {
    if (await this.redis.get(creatorAuthRedisKey.passwordLock(phone))) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '登录失败次数过多，请15分钟后重试');
    }

    const user = await this.prisma.creatorUser.findUnique({ where: { phone } });
    const validPassword = Boolean(user?.password && password && (await bcrypt.compare(password, user.password)));

    if (!user || !validPassword) {
      await this.recordPasswordFailure(phone);
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '手机号或密码错误');
    }

    await this.redis.del(creatorAuthRedisKey.passwordFailures(phone));
    await this.redis.del(creatorAuthRedisKey.passwordLock(phone));
    return user;
  }

  private async recordPasswordFailure(phone: string): Promise<void> {
    const failureKey = creatorAuthRedisKey.passwordFailures(phone);
    const failures = Number((await this.redis.get(failureKey)) ?? 0) + 1;

    if (failures >= CREATOR_AUTH_LIMIT.passwordAttempts) {
      await this.redis.set(creatorAuthRedisKey.passwordLock(phone), '1', CREATOR_AUTH_TTL.passwordLock);
      await this.redis.del(failureKey);
      return;
    }

    await this.redis.set(failureKey, failures, CREATOR_AUTH_TTL.passwordLock);
  }

  private async verifyCode(phone: string, inputCode?: string): Promise<void> {
    const key = creatorAuthRedisKey.code(phone);
    const stored = (await this.redis.get(key)) as StoredCreatorCode | null;

    if (!stored) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '验证码已过期，请重新发送');
    }

    if (stored.code !== inputCode) {
      const attempts = stored.attempts + 1;
      if (attempts >= CREATOR_AUTH_LIMIT.codeAttempts) {
        await this.redis.del(key);
      } else {
        await this.redis.set(key, { ...stored, attempts }, CREATOR_AUTH_TTL.code);
      }
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '验证码错误');
    }

    await this.redis.del(key);
  }

  private async createSession(user: { id: string; phone: string; name: string }): Promise<CreatorLoginResult> {
    const sessionUuid = randomUUID();
    const payload = {
      sub: user.id,
      uuid: sessionUuid,
      subjectType: CREATOR_JWT_SUBJECT_TYPE,
    };
    const token = await this.jwt.signAsync(payload, { expiresIn: this.config.jwt.expiresin as any });
    const session: CreatorSession = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      sessionUuid,
      subjectType: CREATOR_JWT_SUBJECT_TYPE,
    };

    await this.redis.set(
      creatorAuthRedisKey.session(sessionUuid),
      session,
      this.parseExpiresIn(this.config.jwt.expiresin),
    );

    return {
      token,
      id: user.id,
      name: user.name,
      phone: user.phone,
      menuCodes: [],
    };
  }

  private parseExpiresIn(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 60 * 60 * 1000;
    const amount = Number(match[1]);
    const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return amount * factors[match[2] as keyof typeof factors];
  }
}
