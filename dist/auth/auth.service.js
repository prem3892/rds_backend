"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const enums_1 = require("../shared/constants/enums");
const agents_service_1 = require("../agents/agents.service");
let AuthService = class AuthService {
    usersService;
    agentsService;
    jwtService;
    constructor(usersService, agentsService, jwtService) {
        this.usersService = usersService;
        this.agentsService = agentsService;
        this.jwtService = jwtService;
    }
    async validateUser(email, pass) {
        const user = await this.usersService.findByEmail(email);
        if (user && (await user.validatePassword(pass))) {
            const { password, ...result } = user.toObject();
            return result;
        }
        return null;
    }
    async login(loginDto) {
        const validatedUser = await this.validateUser(loginDto.email, loginDto.password);
        if (!validatedUser) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = {
            email: validatedUser.email,
            sub: validatedUser._id.toString(),
            role: validatedUser.role,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: validatedUser._id,
                email: validatedUser.email,
                firstName: validatedUser.firstName,
                lastName: validatedUser.lastName,
                role: validatedUser.role,
            },
        };
    }
    async register(registerDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists.');
        }
        const user = await this.usersService.create({
            ...registerDto,
        });
        if (user.role === enums_1.UserRole.AGENT) {
            await this.agentsService.createAgentProfile(user._id);
        }
        return user;
    }
    async registerAdmin(adminRegisterDto) {
        const existingUser = await this.usersService.findByEmail(adminRegisterDto.email);
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists.');
        }
        const user = await this.usersService.create({
            ...adminRegisterDto,
            role: enums_1.UserRole.ADMIN,
        });
        return user;
    }
    async validateSocketToken(token) {
        try {
            const payload = this.jwtService.verify(token);
            const user = await this.usersService.findById(payload.sub);
            if (!user || user.role !== payload.role) {
                return null;
            }
            return payload;
        }
        catch (error) {
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        agents_service_1.AgentsService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map