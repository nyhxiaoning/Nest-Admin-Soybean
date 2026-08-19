import { CreatorAuthService } from 'src/module/creator/auth/services/creator-auth.service';
import * as bcrypt from 'bcryptjs';

describe('PC Creator Center CreatorAuthService', () => {
  const creatorUser = {
    id: '55ea9508-900a-4c83-8f27-0a65d9555735',
    phone: '13800138000',
    password: null,
    name: '用户38000',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    creatorUser: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(),
  };
  const jwt = {
    signAsync: jest.fn(),
  };
  const config = {
    jwt: { expiresin: '1h' },
  };

  let service: CreatorAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreatorAuthService(prisma as any, redis as any, jwt as any, config as any);
  });

  it('returns and stores a four-digit code outside production', async () => {
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');

    const result = await service.sendCode({ accountType: 'PHONE', phone: '13800138000' });

    expect(result.code).toMatch(/^\d{4}$/);
    expect(redis.set).toHaveBeenCalledWith(
      'pc-creator-center:auth:code:13800138000',
      expect.objectContaining({ code: result.code, attempts: 0 }),
      300_000,
    );
    expect(redis.set).toHaveBeenCalledWith('pc-creator-center:auth:code-cooldown:13800138000', '1', 60_000);
  });

  it('automatically creates a Creator user after a valid code login', async () => {
    redis.get.mockResolvedValue({ code: '0042', attempts: 0 });
    redis.del.mockResolvedValue(1);
    prisma.creatorUser.upsert.mockResolvedValue(creatorUser);
    prisma.creatorUser.update.mockResolvedValue({ ...creatorUser, lastLoginAt: new Date() });
    jwt.signAsync.mockResolvedValue('creator-jwt');

    const result = await service.login({
      accountType: 'PHONE',
      loginType: 'CODE',
      phone: '13800138000',
      code: '0042',
    });

    expect(prisma.creatorUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone: '13800138000' },
        create: expect.objectContaining({ phone: '13800138000', name: '用户38000' }),
      }),
    );
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: creatorUser.id,
        subjectType: 'pc-creator-center',
      }),
      { expiresIn: '1h' },
    );
    expect(result).toEqual({
      token: 'creator-jwt',
      id: creatorUser.id,
      name: creatorUser.name,
      phone: creatorUser.phone,
      menuCodes: [],
    });
  });

  it('logs in an active Creator user with the correct password', async () => {
    const password = 'creator-pass-123';
    prisma.creatorUser.findUnique.mockResolvedValue({
      ...creatorUser,
      password: await bcrypt.hash(password, 4),
    });
    prisma.creatorUser.update.mockResolvedValue({ ...creatorUser, lastLoginAt: new Date() });
    redis.get.mockResolvedValue(null);
    redis.del.mockResolvedValue(1);
    jwt.signAsync.mockResolvedValue('creator-password-jwt');

    const result = await service.login({
      accountType: 'PHONE',
      loginType: 'PASSWORD',
      phone: creatorUser.phone,
      password,
    });

    expect(result.token).toBe('creator-password-jwt');
    expect(redis.del).toHaveBeenCalledWith('pc-creator-center:auth:password-fail:13800138000');
  });

  it('allows an authenticated Creator user to set a first password', async () => {
    prisma.creatorUser.findUnique.mockResolvedValue(creatorUser);
    prisma.creatorUser.update.mockResolvedValue({ ...creatorUser, password: 'hashed' });

    await service.setPassword(
      {
        id: creatorUser.id,
        phone: creatorUser.phone,
        name: creatorUser.name,
        sessionUuid: 'creator-session',
        subjectType: 'pc-creator-center',
      },
      { newPassword: 'new-creator-pass' },
    );

    const update = prisma.creatorUser.update.mock.calls[0][0];
    expect(await bcrypt.compare('new-creator-pass', update.data.password)).toBe(true);
  });

  it('counts an invalid verification code attempt', async () => {
    redis.get.mockResolvedValue({ code: '0042', attempts: 0 });

    await expect(
      service.login({ accountType: 'PHONE', loginType: 'CODE', phone: creatorUser.phone, code: '9999' }),
    ).rejects.toMatchObject({ response: { msg: '验证码错误' } });

    expect(redis.set).toHaveBeenCalledWith(
      'pc-creator-center:auth:code:13800138000',
      { code: '0042', attempts: 1 },
      300_000,
    );
  });

  it('removes the current Creator session on logout', async () => {
    redis.del.mockResolvedValue(1);
    await service.logout({
      id: creatorUser.id,
      phone: creatorUser.phone,
      name: creatorUser.name,
      sessionUuid: 'creator-session',
      subjectType: 'pc-creator-center',
    });

    expect(redis.del).toHaveBeenCalledWith('pc-creator-center:auth:session:creator-session');
  });
});
