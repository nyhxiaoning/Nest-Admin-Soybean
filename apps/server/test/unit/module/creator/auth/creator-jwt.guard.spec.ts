import { UnauthorizedException } from '@nestjs/common';
import { CreatorJwtGuard } from 'src/module/creator/common/guards/creator-jwt.guard';

describe('PC Creator Center CreatorJwtGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const redis = { get: jest.fn() };
  const prisma = { creatorUser: { findUnique: jest.fn() } };
  const request = { headers: { authorization: 'Bearer token' }, creatorUser: undefined };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    request.creatorUser = undefined;
  });

  it('rejects a valid JWT from the backend admin login domain', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 1, uuid: 'admin-session' });
    const guard = new CreatorJwtGuard(jwt as any, redis as any, prisma as any);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('accepts an active PC Creator Center session', async () => {
    const session = {
      id: '55ea9508-900a-4c83-8f27-0a65d9555735',
      phone: '13800138000',
      name: '用户38000',
      sessionUuid: 'creator-session',
      subjectType: 'pc-creator-center',
    };
    jwt.verifyAsync.mockResolvedValue({
      sub: session.id,
      uuid: session.sessionUuid,
      subjectType: session.subjectType,
    });
    redis.get.mockResolvedValue(session);
    prisma.creatorUser.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    const guard = new CreatorJwtGuard(jwt as any, redis as any, prisma as any);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.creatorUser).toEqual(session);
  });
});
