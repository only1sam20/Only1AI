import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuthToken } from '../modules/auth/entities/auth-token.entity';
import { RefreshSession } from '../modules/auth/entities/refresh-session.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserProfile } from '../modules/users/entities/user-profile.entity';
import { Only1Core } from '../modules/only1-core/entities/only1-core.entity';
import { Strategy } from '../modules/strategies/entities/strategy.entity';
import { StrategyRule } from '../modules/strategies/entities/strategy-rule.entity';
import { MarketMonitor } from '../modules/market-scanner/entities/market-monitor.entity';
import { ConfluenceAssessment } from '../modules/confluence/entities/confluence-assessment.entity';
import { Analysis } from '../modules/analysis/entities/analysis.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { MarketplaceListing } from '../modules/marketplace/entities/marketplace-listing.entity';
import { AuditLog } from '../modules/administration/entities/audit-log.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'only1ai',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME ?? 'only1ai',
  entities: [User, UserProfile, AuthToken, RefreshSession, Only1Core, Strategy, StrategyRule, MarketMonitor, ConfluenceAssessment, Analysis, Notification, MarketplaceListing, AuditLog],
  migrations: ['dist/database/migrations/*.js'],
});
