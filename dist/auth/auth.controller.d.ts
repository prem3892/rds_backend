import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { UserDocument } from 'src/schemas/user.schema';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: any;
    }>;
    register(admin: JwtPayload, registerDto: RegisterDto): Promise<Omit<UserDocument, 'password'>>;
    registerAdmin(adminRegisterDto: AdminRegisterDto): Promise<Omit<UserDocument, 'password'>>;
}
