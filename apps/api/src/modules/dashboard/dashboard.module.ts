import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/entities/user.entity';
import { Only1Core } from '../only1-core/entities/only1-core.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { MarketMonitor } from '../market-scanner/entities/market-monitor.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({ imports: [TypeOrmModule.forFeature([User, UserProfile, Only1Core, Strategy, MarketMonitor])], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
