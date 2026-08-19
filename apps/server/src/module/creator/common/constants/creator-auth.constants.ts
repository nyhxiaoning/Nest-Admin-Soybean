/** PC Creator Center 账号类型。 */
export enum CreatorAccountType {
  PHONE = 'PHONE',
}

/** PC Creator Center 登录类型。 */
export enum CreatorLoginType {
  CODE = 'CODE',
  PASSWORD = 'PASSWORD',
}

export const CREATOR_JWT_SUBJECT_TYPE = 'pc-creator-center' as const;
export const CREATOR_USER_ACTIVE_STATUS = 'ACTIVE';

export const CREATOR_AUTH_TTL = {
  code: 5 * 60 * 1000,
  codeCooldown: 60 * 1000,
  passwordLock: 15 * 60 * 1000,
} as const;

export const CREATOR_AUTH_LIMIT = {
  codeAttempts: 5,
  passwordAttempts: 5,
} as const;

const PREFIX = 'pc-creator-center:auth:';

export const creatorAuthRedisKey = {
  code: (phone: string) => `${PREFIX}code:${phone}`,
  codeCooldown: (phone: string) => `${PREFIX}code-cooldown:${phone}`,
  passwordFailures: (phone: string) => `${PREFIX}password-fail:${phone}`,
  passwordLock: (phone: string) => `${PREFIX}password-lock:${phone}`,
  session: (uuid: string) => `${PREFIX}session:${uuid}`,
};
