import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || '',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Only allow access tokens for API requests
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type for API access');
    }

    // You could fetch the full user object here if needed for every request
    // const user = await this.usersService.findById(payload.sub);
    // if (!user) {
    //   throw new UnauthorizedException();
    // }
    // For now, just return the payload, assuming it contains enough info
    // and user existence is checked at login.
    Logger.log(`JWT Payload validated successfully`, JwtStrategy.name, {
      payload,
    });
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      tokenVersion: payload.tokenVersion,
    };
  }
}
