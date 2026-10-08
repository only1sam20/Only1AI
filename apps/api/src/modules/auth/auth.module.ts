import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthToken } from './entities/auth-token.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { JwtAccessStrategy } from '../../common/jwt-access.strategy';
import { AuthEmailService } from './auth-email.service';
import { StrategySuggestion } from '../strategies/entities/strategy-suggestion.entity';
import { requireJwtSecret } from '../../config/environment';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: requireJwtSecret((name) => config.get<string>(name)),
        signOptions: { issuer: 'only1ai' },
      }),
    }),
    TypeOrmModule.forFeature([User, UserProfile, AuthToken, RefreshSession, StrategySuggestion]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService, JwtAccessStrategy],
})
export class AuthModule {}
