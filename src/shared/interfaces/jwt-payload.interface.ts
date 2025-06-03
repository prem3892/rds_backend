import { UserRole } from '../constants/enums';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
}
