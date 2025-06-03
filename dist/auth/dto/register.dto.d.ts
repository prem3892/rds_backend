import { UserRole } from 'src/shared/constants/enums';
export declare class RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
}
