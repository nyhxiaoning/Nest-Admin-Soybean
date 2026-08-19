import { CREATOR_JWT_SUBJECT_TYPE } from '../constants/creator-auth.constants';

/** PC Creator Center 各业务模块可复用的认证 Session。 */
export interface CreatorSession {
  id: string;
  phone: string;
  name: string;
  sessionUuid: string;
  subjectType: typeof CREATOR_JWT_SUBJECT_TYPE;
}
