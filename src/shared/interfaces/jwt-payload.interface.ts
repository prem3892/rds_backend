import { UserRole } from '../constants/enums';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  tokenVersion?: number; // For refresh token validation
  type?: 'access' | 'refresh'; // Token type
}
