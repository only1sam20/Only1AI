import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/entities/user.entity';
import { Only1Core } from '../only1-core/entities/only1-core.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { MarketMonitor } from '../market-scanner/entities/market-monitor.entity';

@Injectable()
export class DashboardService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>, @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>, @InjectRepository(Only1Core) private readonly cores: Repository<Only1Core>, @InjectRepository(Strategy) private readonly strategies: Repository<Strategy>, @InjectRepository(MarketMonitor) private readonly monitors: Repository<MarketMonitor>) {}

  async missionControl(userId: string) {
    const [user, profile, activeCores, activeStrategies, monitoredMarkets] = await Promise.all([this.users.findOneByOrFail({ id: userId }), this.profiles.findOneBy({ userId }), this.cores.countBy({ userId }), this.strategies.countBy({ userId }), this.monitors.countBy({ userId })]);
    return {
      greetingName: profile?.displayName ?? user.email.split('@')[0],
      onboarding: [
        { key: 'profile', label: 'Complete your profile', complete: Boolean(profile?.displayName && profile?.timezone) },
        { key: 'core', label: 'Create your Only1Core', complete: activeCores > 0 },
        { key: 'strategy', label: 'Define your first strategy', complete: activeStrategies > 0 },
        { key: 'scanner', label: 'Choose markets to monitor', complete: monitoredMarkets > 0 },
      ],
      metrics: { activeCores, activeStrategies, monitoredMarkets, opportunityZones: 0 },
      opportunities: [],
      notice: 'Opportunity data appears here after Only1Core, Strategy Builder, and Market Scanner are configured.',
    };
  }
}
