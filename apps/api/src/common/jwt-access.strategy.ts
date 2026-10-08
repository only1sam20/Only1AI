import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from './authenticated-user.interface';
import { User } from '../modules/users/entities/user.entity';
import { requireJwtSecret } from '../config/environment';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: requireJwtSecret((name) => config.get<string>(name)),
      issuer: 'only1ai',
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string; type: string }): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') throw new UnauthorizedException();
    const user = await this.users.findOneBy({ id: payload.sub, isActive: true });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, role: user.role };
  }
}
