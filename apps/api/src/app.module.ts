import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { AuthToken } from './modules/auth/entities/auth-token.entity';
import { RefreshSession } from './modules/auth/entities/refresh-session.entity';
import { User } from './modules/users/entities/user.entity';
import { UserProfile } from './modules/users/entities/user-profile.entity';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { Only1CoreModule } from './modules/only1-core/only1-core.module';
import { Only1Core } from './modules/only1-core/entities/only1-core.entity';
import { Strategy } from './modules/strategies/entities/strategy.entity';
import { StrategyRule } from './modules/strategies/entities/strategy-rule.entity';
import { StrategiesModule } from './modules/strategies/strategies.module';
import { MarketMonitor } from './modules/market-scanner/entities/market-monitor.entity';
import { MarketScannerModule } from './modules/market-scanner/market-scanner.module';
import { ConfluenceAssessment } from './modules/confluence/entities/confluence-assessment.entity';
import { ConfluenceModule } from './modules/confluence/confluence.module';
import { Analysis } from './modules/analysis/entities/analysis.entity';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { Notification } from './modules/notifications/entities/notification.entity';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MarketplaceListing } from './modules/marketplace/entities/marketplace-listing.entity';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { AuditLog } from './modules/administration/entities/audit-log.entity';
import { AdministrationModule } from './modules/administration/administration.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    TypeOrmModule.forRoot({
      type: 'postgres', host: process.env.DATABASE_HOST ?? 'localhost', port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER ?? 'only1ai', password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME ?? 'only1ai', entities: [User, UserProfile, AuthToken, RefreshSession, Only1Core, Strategy, StrategyRule, MarketMonitor, ConfluenceAssessment, Analysis, Notification, MarketplaceListing, AuditLog], synchronize: false,
    }),
    AuthModule,
    UsersModule,
    DashboardModule,
    Only1CoreModule,
    StrategiesModule,
    MarketScannerModule,
    ConfluenceModule,
    AnalysisModule,
    NotificationsModule,
    MarketplaceModule,
    AdministrationModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
