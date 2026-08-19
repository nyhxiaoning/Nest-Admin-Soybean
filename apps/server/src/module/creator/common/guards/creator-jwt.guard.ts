import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/infrastructure/prisma';
import { RedisService } from 'src/module/common/redis/redis.service';
import {
  CREATOR_JWT_SUBJECT_TYPE,
  CREATOR_USER_ACTIVE_STATUS,
  creatorAuthRedisKey,
} from '../constants/creator-auth.constants';
import { CreatorSession } from '../interfaces/creator-session.interface';

interface CreatorJwtPayload {
  sub: string;
  uuid: string;
  subjectType: string;
}

/** 仅接受 PC Creator Center JWT 与独立 Redis Session。 */
@Injectable()
export class CreatorJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!token) throw new UnauthorizedException('请先登录 PC Creator Center');

    let payload: CreatorJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<CreatorJwtPayload>(token);
    } catch {
      throw new UnauthorizedException('无效的创作者登录凭证');
    }

    if (payload.subjectType !== CREATOR_JWT_SUBJECT_TYPE || !payload.uuid || !payload.sub) {
      throw new UnauthorizedException('无效的创作者登录凭证');
    }

    const session = (await this.redis.get(creatorAuthRedisKey.session(payload.uuid))) as CreatorSession | null;
    if (!session || session.id !== payload.sub || session.subjectType !== CREATOR_JWT_SUBJECT_TYPE) {
      throw new UnauthorizedException('创作者登录已过期');
    }

    const user = await this.prisma.creatorUser.findUnique({
      where: { id: session.id },
      select: { status: true },
    });
    if (!user || user.status !== CREATOR_USER_ACTIVE_STATUS) {
      throw new UnauthorizedException('创作者账号不可用');
    }

    request.creatorUser = session;
    return true;
  }
}
