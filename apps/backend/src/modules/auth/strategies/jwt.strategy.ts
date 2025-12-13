import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'rancher-hub-secret-key',
    });
  }

  async validate(payload: any) {
    // For temporary tokens (2FA flow), only validate structure
    if (payload.temp) {
      return { userId: payload.sub, username: payload.username, temp: true };
    }

    // For regular tokens, validate user exists and is active
    const user = await this.authService.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }

    return { userId: payload.sub, username: payload.username };
  }
}
