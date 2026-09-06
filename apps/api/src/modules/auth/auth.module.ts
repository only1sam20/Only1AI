import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthToken } from './entities/auth-token.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { JwtAccessStrategy } from '../../common/jwt-access.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { issuer: 'only1ai' } }), TypeOrmModule.forFeature([User, AuthToken, RefreshSession])],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy],
})
export class AuthModule {}
