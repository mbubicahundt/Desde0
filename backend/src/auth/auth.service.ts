import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { JwtUser, UserRole } from '../common/request-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(params: {
    email: string;
    password: string;
    role: UserRole;
    name?: string;
  }) {
    const existing = await this.users.findByEmail(params.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(params.password, 10);

    try {
      const created = await this.users.createUser({
        email: params.email,
        passwordHash,
        role: params.role,
        name: params.name ?? null,
      });

      const token = await this.signToken({
        sub: created.id,
        role: created.role,
        email: created.email,
        name: created.name,
      });

      return {
        accessToken: token,
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === '23505'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.signToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    return { accessToken: token };
  }

  async signToken(payload: JwtUser): Promise<string> {
    return this.jwt.signAsync(payload);
  }
}
