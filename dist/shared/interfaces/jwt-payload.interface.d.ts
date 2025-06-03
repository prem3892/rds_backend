import { UserRole } from '../constants/enums';
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
}
