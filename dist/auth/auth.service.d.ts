import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UserDocument } from 'src/schemas/user.schema';
import { AgentsService } from 'src/agents/agents.service';
export declare class AuthService {
    private readonly usersService;
    private readonly agentsService;
    private readonly jwtService;
    constructor(usersService: UsersService, agentsService: AgentsService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<Omit<UserDocument, 'password'> | null>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: any;
    }>;
    register(registerDto: RegisterDto): Promise<UserDocument>;
    registerAdmin(adminRegisterDto: AdminRegisterDto): Promise<UserDocument>;
    validateSocketToken(token: string): Promise<JwtPayload | null>;
}
