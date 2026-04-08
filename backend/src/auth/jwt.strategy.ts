import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { requiredStringAny } from '../config/env.util';
import type { JwtUser } from '../common/request-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requiredStringAny(config, [
        'JWT_SECRET',
        'JWT_SECRET_PASSWORD',
      ]),
    });
  }

  validate(payload: JwtUser): JwtUser {
    return payload;
  }
}
