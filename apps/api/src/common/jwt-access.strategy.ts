import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from './authenticated-user.interface';
import { User } from '../modules/users/entities/user.entity';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET ?? 'development-secret-only', issuer: 'only1ai', ignoreExpiration: false });
  }

  async validate(payload: { sub: string; type: string }): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') throw new UnauthorizedException();
    const user = await this.users.findOneBy({ id: payload.sub, isActive: true });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, role: user.role };
  }
}
