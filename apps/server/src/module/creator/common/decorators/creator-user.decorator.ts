import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CreatorSession } from '../interfaces/creator-session.interface';

/** 获取 CreatorJwtGuard 校验后的 PC Creator Center Session。 */
export const CreatorUser = createParamDecorator((_data: unknown, context: ExecutionContext): CreatorSession => {
  return context.switchToHttp().getRequest().creatorUser;
});
